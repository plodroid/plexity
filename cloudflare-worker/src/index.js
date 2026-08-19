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

function parseDuckDuckGo(html) {
  const blocks = html.split(/class="result\s/).slice(1);
  const results = [];

  for (const block of blocks) {
    const link = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const snippet = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    const url = decodeDuckUrl(link[1]);
    if (!/^https?:\/\//i.test(url)) continue;
    results.push({
      title: cleanHtml(link[2]),
      url,
      snippet: cleanHtml(snippet?.[1] || '')
    });
    if (results.length >= 8) break;
  }

  return results;
}

async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 PlexitySearch/1.0',
      'accept-language': 'en-US,en;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`DuckDuckGo returned ${res.status}`);
  return parseDuckDuckGo(await res.text());
}

async function searchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=6`;
  const res = await fetch(url);
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
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
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
      content: 'You are Plexity, an accurate web-search assistant. Answer the exact question directly. Use the supplied search results for factual/current claims, cite them with [1], [2], etc., and ignore irrelevant results. If the sources are insufficient, say so instead of inventing facts. Keep answers concise and useful.'
    },
    {
      role: 'user',
      content: `Question: ${query}\n\nSearch results:\n${context || 'No usable search results were returned.'}`
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

    let sources = [];
    try {
      const [ddg, wiki] = await Promise.allSettled([
        searchDuckDuckGo(query),
        searchWikipedia(query)
      ]);
      sources = dedupe([
        ...(ddg.status === 'fulfilled' ? ddg.value : []),
        ...(wiki.status === 'fulfilled' ? wiki.value : [])
      ]).slice(0, 8);
    } catch {
      sources = [];
    }

    if (mode === 'search') {
      return json({
        query,
        answer: '',
        sources,
        model: null,
        aiUnavailable: false,
        aiLimited: false,
        searchOnly: true
      });
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: buildMessages(query, sources),
        max_tokens: 220,
        temperature: 0.2,
        repetition_penalty: 1.1
      });

      return json({
        query,
        answer: String(result?.response || '').trim(),
        sources,
        model: MODEL,
        aiUnavailable: false,
        aiLimited: false
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
        error: failure.message
      }, failure.status);
    }
  }
};
