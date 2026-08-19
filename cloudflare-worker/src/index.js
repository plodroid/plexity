const MODEL = '@cf/meta/llama-3.2-3b-instruct';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store'
  }
});

function cleanHtml(text = '') {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeDuckUrl(raw = '') {
  try {
    const value = raw.startsWith('//') ? `https:${raw}` : raw;
    const url = new URL(value, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : url.href;
  } catch {
    return raw;
  }
}

function addResult(results, title, rawUrl, snippet = '') {
  const url = decodeDuckUrl(rawUrl);
  const cleanTitle = cleanHtml(title);
  if (!cleanTitle || !/^https?:\/\//i.test(url)) return;
  results.push({ title: cleanTitle, url, snippet: cleanHtml(snippet) });
}

function parseDuckDuckGoHtml(html) {
  const results = [];

  // DuckDuckGo HTML endpoint. Be tolerant of attribute ordering and quote style.
  const links = [...html.matchAll(/<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const match of links) {
    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 3000);
    const snippet = after.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div|td)>/i)?.[1] || '';
    addResult(results, match[2], match[1], snippet);
    if (results.length >= 8) break;
  }

  return results;
}

function parseDuckDuckGoLite(html) {
  const results = [];
  const links = [...html.matchAll(/<a\b[^>]*class=["'][^"']*result-link[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  for (const match of links) {
    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 2500);
    const snippet = after.match(/class=["'][^"']*result-snippet[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1] || '';
    addResult(results, match[2], match[1], snippet);
    if (results.length >= 8) break;
  }

  return results;
}

async function fetchDuck(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36 PlexitySearch/1.0',
      'accept': 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`DuckDuckGo returned ${res.status}`);
  return res.text();
}

async function searchDuckDuckGo(query) {
  const encoded = encodeURIComponent(query);

  // Lite is simpler and less fragile for server-side parsing.
  try {
    const lite = await fetchDuck(`https://lite.duckduckgo.com/lite/?q=${encoded}`);
    const parsed = parseDuckDuckGoLite(lite);
    if (parsed.length) return parsed;
  } catch (error) {
    console.warn('DuckDuckGo Lite failed', error);
  }

  const html = await fetchDuck(`https://html.duckduckgo.com/html/?q=${encoded}`);
  return parseDuckDuckGoHtml(html);
}

async function searchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=6`;
  const res = await fetch(url, { headers: { 'api-user-agent': 'PlexitySearch/1.0' } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.pages || []).map((p) => ({
    title: p.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
    snippet: cleanHtml(p.excerpt || p.description || '')
  }));
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.url) return false;
    let key = item.url;
    try {
      const u = new URL(item.url);
      u.hash = '';
      key = `${u.hostname}${u.pathname}${u.search}`.toLowerCase();
    } catch {}
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildMessages(query, sources) {
  const context = sources.slice(0, 6).map((s, i) =>
    `[${i + 1}] ${s.title}\n${s.snippet || '(no snippet)'}\n${s.url}`
  ).join('\n\n');

  return [
    {
      role: 'system',
      content: 'You are Plexity, an accurate web-search assistant. Answer the exact question directly using the supplied web results. Cite factual/current claims inline with [1], [2], etc. Never claim something is current, latest, best, cheapest, or available unless the supplied sources support it. Ignore irrelevant results. If sources conflict, say so. Keep answers concise and useful.'
    },
    {
      role: 'user',
      content: `Question: ${query}\n\nSearch results:\n${context}`
    }
  ];
}

function classifyAiError(err) {
  const status = Number(err?.status || err?.response?.status || 0);
  const text = String(err?.message || err || 'Workers AI failed');
  const limited = status === 429 || /free allocation|quota|neuron|rate.?limit|limit exceeded|capacity/i.test(text);
  return {
    limited,
    status: limited ? 429 : 503,
    message: limited
      ? 'Cloudflare Workers AI free quota is exhausted or temporarily rate-limited.'
      : 'Cloudflare Workers AI is temporarily unavailable.'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return json({ ok: true });

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({
        ok: true,
        service: 'plexity-api',
        model: MODEL,
        billingMode: 'free-plan-hard-stop'
      });
    }

    if (url.pathname !== '/api/search') return json({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const query = String(body?.query || '').trim().slice(0, 300);
    const mode = body?.mode === 'search' ? 'search' : 'ai';
    if (!query) return json({ error: 'Missing query' }, 400);

    const [ddg, wiki] = await Promise.allSettled([
      searchDuckDuckGo(query),
      searchWikipedia(query)
    ]);

    const sources = dedupe([
      ...(ddg.status === 'fulfilled' ? ddg.value : []),
      ...(wiki.status === 'fulfilled' ? wiki.value : [])
    ]).slice(0, 8);

    if (mode === 'search') {
      return json({
        query,
        answer: '',
        sources,
        model: null,
        aiUnavailable: false,
        aiLimited: false,
        searchUnavailable: sources.length === 0,
        searchOnly: true
      });
    }

    // Do not spend Workers AI quota on an unsourced answer and do not let the
    // model hallucinate a supposedly current answer from old training data.
    if (sources.length === 0) {
      return json({
        query,
        answer: '',
        sources: [],
        model: MODEL,
        aiUnavailable: false,
        aiLimited: false,
        searchUnavailable: true,
        error: 'Live web search returned no usable sources, so Plexity skipped AI generation.'
      });
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: buildMessages(query, sources),
        max_tokens: 220,
        temperature: 0.15,
        repetition_penalty: 1.1
      });

      return json({
        query,
        answer: String(result?.response || '').trim(),
        sources,
        model: MODEL,
        aiUnavailable: false,
        aiLimited: false,
        searchUnavailable: false
      });
    } catch (err) {
      const failure = classifyAiError(err);

      return json({
        query,
        answer: '',
        sources,
        model: MODEL,
        aiUnavailable: true,
        aiLimited: failure.limited,
        searchUnavailable: false,
        error: failure.message
      }, failure.status);
    }
  }
};
