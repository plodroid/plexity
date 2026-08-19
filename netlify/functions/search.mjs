import OpenAI from 'openai';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store'
  }
});

const decode = (s = '') => s
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function unwrapDuckUrl(href = '') {
  try {
    const u = new URL(href, 'https://duckduckgo.com');
    const uddg = u.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : u.href;
  } catch {
    return href;
  }
}

async function duckSearch(query) {
  const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Plexity/1.0)',
      'accept-language': 'en-US,en;q=0.9'
    }
  });
  if (!r.ok) throw new Error(`Search HTTP ${r.status}`);
  const html = await r.text();
  const blocks = [...html.matchAll(/<div class="result[\s\S]*?<\/div>\s*<\/div>/gi)].slice(0, 12);
  const out = [];
  for (const m of blocks) {
    const b = m[0];
    const link = b.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const snippet = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
    const url = unwrapDuckUrl(link[1]);
    const title = decode(link[2]);
    const text = decode(snippet?.[1] || snippet?.[2] || '');
    if (!/^https?:/i.test(url)) continue;
    out.push({ title, url, snippet: text });
  }
  return out;
}

async function wikiFallback(query) {
  const r = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=8`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data.pages || []).map((p) => ({
    title: p.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
    snippet: decode(p.excerpt || p.description || '')
  }));
}

function tokens(q) {
  const stop = new Set(['the','a','an','is','are','was','were','what','which','who','when','where','why','how','to','of','for','in','on','and','or','do','does','did','right','now']);
  return [...new Set(q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(x => x.length > 1 && !stop.has(x)))];
}

function rank(query, items) {
  const ts = tokens(query);
  return items.map((r, i) => {
    const title = (r.title || '').toLowerCase();
    const snippet = (r.snippet || '').toLowerCase();
    let score = 0;
    for (const t of ts) {
      if (title.includes(t)) score += 6;
      if (snippet.includes(t)) score += 2;
    }
    return { ...r, _score: score, _i: i };
  }).sort((a, b) => b._score - a._score || a._i - b._i).slice(0, 8);
}

function promptFor(query, sources) {
  const useful = sources.filter(s => (s._score || 0) > 0).slice(0, 5);
  const sourceText = useful.map((s, i) => `[${i + 1}] ${s.title}\n${(s.snippet || '').slice(0, 320)}\n${s.url}`).join('\n\n');
  return `You are Plexity, an accurate AI search assistant. Answer the user's exact question first. For current or factual claims, use the useful web snippets below and cite them inline as [1], [2], etc. Ignore irrelevant snippets. If the sources are insufficient, say so instead of inventing facts. Keep the answer concise and useful, ideally under 120 words.\n\nQuestion: ${query}\n\nSources:\n${sourceText || 'No useful sources were found.'}`;
}

function classifyAiError(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || error || 'Unknown AI error');
  if (status === 429 || /quota|credit|limit|rate/i.test(message)) return { code: 'quota', message: 'Free AI quota is temporarily exhausted.' };
  if (/model|not found|unsupported|invalid.*model/i.test(message)) return { code: 'model', message: 'The configured AI model is unavailable.' };
  if (/OPENAI_BASE_URL|OPENAI_API_KEY|AI Gateway|gateway/i.test(message)) return { code: 'gateway', message: 'Netlify AI Gateway is not active for this deploy yet.' };
  return { code: 'unknown', message: 'AI is temporarily unavailable.' };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const query = String(body?.query || '').trim();
  if (!query) return json({ error: 'Missing query' }, 400);
  if (query.length > 300) return json({ error: 'Query too long' }, 400);

  let results = [];
  try { results = await duckSearch(query); } catch (e) { console.warn('DuckDuckGo failed', e); }
  if (results.length < 3) results.push(...await wikiFallback(query));
  const seen = new Set();
  results = rank(query, results.filter(r => r.url && !seen.has(r.url) && seen.add(r.url)));

  let answer = null;
  let aiUnavailable = false;
  let aiError = null;
  let aiModel = null;

  try {
    if (!process.env.OPENAI_BASE_URL || !process.env.OPENAI_API_KEY) {
      throw new Error('Netlify AI Gateway environment variables are missing');
    }

    const openai = new OpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.6-sol',
      input: [{ role: 'user', content: promptFor(query, results) }],
      reasoning: { effort: 'minimal' },
      max_output_tokens: 180
    });

    answer = String(response.output_text || '').trim() || null;
    aiModel = response.model || 'gpt-5.6-sol';
    if (!answer) throw new Error('AI returned an empty answer');
  } catch (e) {
    console.warn('Netlify AI Gateway unavailable', e);
    aiUnavailable = true;
    aiError = classifyAiError(e);
  }

  return json({
    query,
    answer,
    aiUnavailable,
    aiError,
    aiModel,
    sources: results.map(({ _score, _i, ...r }) => r)
  });
};
