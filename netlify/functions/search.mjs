const SEARCH_TIMEOUT = 4200;
const VERIFY_TIMEOUT = 2200;
const MAX_RESULTS = 50;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

function cleanHtml(text = '') {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url = '') {
  try {
    const u = new URL(url);
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_|source$|campaign$|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key);
    }
    const q = u.searchParams.toString();
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}${q ? `?${q}` : ''}`;
  } catch {
    return String(url).trim();
  }
}

function hostOf(url = '') {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function isUsefulUrl(url = '') {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    return ![
      'duckduckgo.com','html.duckduckgo.com','lite.duckduckgo.com',
      'bing.com','www.bing.com','google.com','www.google.com',
      'search.yahoo.com','r.search.yahoo.com','yahoo.com','www.yahoo.com'
    ].includes(h);
  } catch { return false; }
}

async function fetchWithTimeout(url, options = {}, ms = SEARCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

const browserHeaders = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  'accept': 'text/html,application/xhtml+xml'
};

function decodeDuckUrl(raw = '') {
  try {
    const value = raw.startsWith('//') ? `https:${raw}` : raw;
    const u = new URL(value, 'https://duckduckgo.com');
    const target = u.searchParams.get('uddg');
    return normalizeUrl(target ? decodeURIComponent(target) : u.href);
  } catch { return normalizeUrl(raw); }
}

function parseDuck(html) {
  const out = [];
  const matches = [...html.matchAll(/<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of matches) {
    const url = decodeDuckUrl(m[1]);
    if (!isUsefulUrl(url)) continue;
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 2200);
    const snippet = after.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div|td)>/i)?.[1] || '';
    out.push({ title: cleanHtml(m[2]), url, snippet: cleanHtml(snippet), engine: 'DuckDuckGo' });
  }
  return out;
}

function parseBing(html) {
  const out = [];
  const blocks = html.split(/<li[^>]+class=["'][^"']*b_algo[^"']*["'][^>]*>/i).slice(1);
  for (const block of blocks) {
    const link = block.match(/<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const url = normalizeUrl(link[1]);
    if (!isUsefulUrl(url)) continue;
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    out.push({ title: cleanHtml(link[2]), url, snippet: cleanHtml(snippet), engine: 'Bing' });
  }
  return out;
}

function parseYahoo(html) {
  const out = [];
  const links = [...html.matchAll(/<h3[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of links) {
    let url = m[1];
    try {
      const u = new URL(url, 'https://search.yahoo.com');
      const ru = u.searchParams.get('RU');
      if (ru) url = decodeURIComponent(ru);
    } catch {}
    url = normalizeUrl(url);
    if (!isUsefulUrl(url)) continue;
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 1800);
    const snippet = after.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    out.push({ title: cleanHtml(m[2]), url, snippet: cleanHtml(snippet), engine: 'Yahoo' });
  }
  return out;
}

async function searchDuck(query) {
  try {
    const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers: browserHeaders });
    if (!res.ok) return [];
    return parseDuck(await res.text());
  } catch { return []; }
}

async function searchBing(query) {
  try {
    const res = await fetchWithTimeout(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=30`, { headers: browserHeaders });
    if (!res.ok) return [];
    return parseBing(await res.text());
  } catch { return []; }
}

async function searchYahoo(query) {
  try {
    const res = await fetchWithTimeout(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}&n=20`, { headers: browserHeaders });
    if (!res.ok) return [];
    return parseYahoo(await res.text());
  } catch { return []; }
}

function scoreResult(result, username) {
  const needle = username.toLowerCase();
  const title = String(result.title || '').toLowerCase();
  const snippet = String(result.snippet || '').toLowerCase();
  const url = String(result.url || '').toLowerCase();
  let score = 0;

  if (url.includes(`@${needle}`)) score += 9;
  if (url.includes(`/${needle}`)) score += 8;
  if (url.includes(`=${needle}`)) score += 5;
  if (title.includes(`@${needle}`)) score += 6;
  if (title.includes(needle)) score += 4;
  if (snippet.includes(`@${needle}`)) score += 4;
  if (snippet.includes(needle)) score += 2;

  try {
    const u = new URL(result.url);
    const parts = u.pathname.split('/').filter(Boolean).map(p => decodeURIComponent(p).toLowerCase());
    if (parts.some(p => p === needle || p === `@${needle}`)) score += 7;
    if (u.hostname.split('.')[0].toLowerCase() === needle) score += 5;
  } catch {}

  return score;
}

function dedupe(items, username) {
  const map = new Map();
  for (const item of items) {
    if (!item?.url || !isUsefulUrl(item.url)) continue;
    const score = scoreResult(item, username);
    if (score < 2) continue;
    const key = normalizeUrl(item.url).toLowerCase();
    const prev = map.get(key);
    if (!prev || score > prev.score) map.set(key, { ...item, score });
  }
  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}

async function searchWeb(username) {
  const queries = [
    `"${username}"`,
    `"@${username}"`,
    `${username} profile`,
    `inurl:${username} ${username}`
  ];

  const jobs = [];
  for (const q of queries) {
    jobs.push(searchDuck(q), searchBing(q), searchYahoo(q));
  }

  const settled = await Promise.allSettled(jobs);
  const combined = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  return dedupe(combined, username);
}

function looksLikeDirectProfile(url, username) {
  try {
    const u = new URL(url);
    const needle = username.toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean).map(p => decodeURIComponent(p).toLowerCase());
    return parts.some(p => p === needle || p === `@${needle}`) || u.pathname.toLowerCase().includes(`/@${needle}`);
  } catch { return false; }
}

async function verifyOne(result, username) {
  if (!looksLikeDirectProfile(result.url, username)) return { ...result, status: 'unknown' };

  try {
    const res = await fetchWithTimeout(result.url, {
      headers: browserHeaders,
      method: 'GET'
    }, VERIFY_TIMEOUT);

    if (res.status === 404 || res.status === 410) return { ...result, status: 'unknown' };
    if (res.status >= 200 && res.status < 400) return { ...result, status: 'found', statusCode: res.status };
  } catch {}

  // A search engine surfaced the URL but the target blocked our verification request.
  return { ...result, status: result.score >= 9 ? 'found' : 'unknown' };
}

async function verifyTop(results, username) {
  const out = [...results];
  const indexes = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => looksLikeDirectProfile(r.url, username))
    .slice(0, 10);

  await Promise.all(indexes.map(async ({ r, i }) => {
    out[i] = await verifyOne(r, username);
  }));

  return out;
}

function toUiResult(result, username) {
  const score = result.score ?? scoreResult(result, username);
  return {
    site: result.title || hostOf(result.url) || 'Web result',
    title: result.title || '',
    url: result.url,
    snippet: result.snippet || '',
    engine: result.engine || 'Web',
    status: result.status || (score >= 9 ? 'found' : 'unknown'),
    statusCode: result.statusCode || null,
    score
  };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const username = String(body?.username || '').trim().replace(/^@+/, '').slice(0, 64);
  if (!username) return json({ error: 'Missing username' }, 400);

  try {
    const discovered = await searchWeb(username);
    const verified = await verifyTop(discovered, username);
    const results = verified.map(r => toUiResult(r, username));

    return json({
      username,
      checked: results.length,
      found: results.filter(r => r.status === 'found').length,
      unknown: results.filter(r => r.status === 'unknown').length,
      results,
      source: 'public web search indexes'
    });
  } catch (error) {
    console.error(error);
    return json({ error: error?.message || 'Search failed' }, 500);
  }
};
