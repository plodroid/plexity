const SEARCH_TIMEOUT = 4200;
const PAGE_TIMEOUT = 2800;
const READER_TIMEOUT = 6500;
const MAX_RESULTS = 40;
const MAX_INSPECT = 10;
const MAX_READER_FALLBACKS = 2;
const CACHE_TTL = 30 * 60 * 1000;

const cache = new Map();

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

const browserHeaders = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  'accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.6'
};

function normalizeUrl(url = '', base) {
  try {
    const u = new URL(url, base);
    if (!/^https?:$/.test(u.protocol)) return '';
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_|source$|campaign$|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function hostOf(url = '') {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function isSearchHost(url = '') {
  const h = hostOf(url).toLowerCase();
  return [
    'google.com','www.google.com','bing.com','www.bing.com',
    'duckduckgo.com','html.duckduckgo.com','lite.duckduckgo.com',
    'search.yahoo.com','yahoo.com','www.yahoo.com','r.jina.ai'
  ].includes(h);
}

function isUsefulUrl(url = '') {
  return !!normalizeUrl(url) && !isSearchHost(url);
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function usernameRegex(username, global = false) {
  const token = escapeRegex(username);
  return new RegExp(`(^|[^a-z0-9._-])@?${token}(?=$|[^a-z0-9._-])`, global ? 'ig' : 'i');
}

function hasUsername(value, username) {
  if (!value) return false;
  let text = String(value);
  try { text = decodeURIComponent(text); } catch {}
  return usernameRegex(username).test(text);
}

function countUsername(value, username) {
  const matches = String(value || '').match(usernameRegex(username, true));
  return Math.min(matches?.length || 0, 50);
}

function cleanText(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contextAround(text, username, radius = 150) {
  const clean = cleanText(text);
  const match = clean.match(usernameRegex(username));
  if (!match || match.index == null) return '';
  const start = Math.max(0, match.index - radius);
  const end = Math.min(clean.length, match.index + match[0].length + radius);
  return `${start ? '…' : ''}${clean.slice(start, end).trim()}${end < clean.length ? '…' : ''}`;
}

async function fetchWithTimeout(url, options = {}, timeout = SEARCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function parseMarkdownLinks(markdown, username, engine = 'Jina Reader') {
  const out = [];
  const seen = new Set();
  for (const m of String(markdown || '').matchAll(/\[([^\]]{1,180})\]\((https?:\/\/[^\s)]+)\)/g)) {
    const url = normalizeUrl(m[2]);
    if (!url || !isUsefulUrl(url)) continue;
    const title = cleanText(m[1]);
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let score = 0;
    if (hasUsername(url, username)) score += 10;
    if (hasUsername(title, username)) score += 5;
    if (!score) continue;

    out.push({ title: title || hostOf(url), url, snippet: '', engine, searchScore: score });
    if (out.length >= 25) break;
  }
  return out;
}

async function readerSearchTarget(target, username) {
  try {
    const res = await fetchWithTimeout(`https://r.jina.ai/${target}`, {
      headers: { 'accept': 'text/plain', 'user-agent': 'Plexity/4.1' }
    }, READER_TIMEOUT);
    if (!res.ok) return [];
    return parseMarkdownLinks(await res.text(), username, 'Jina Reader');
  } catch {
    return [];
  }
}

async function readerSearch(username) {
  const query = `"${username}" OR "@${username}"`;
  const targets = [
    `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`,
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`
  ];
  const settled = await Promise.allSettled(targets.map(target => readerSearchTarget(target, username)));
  return settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

function parseDuck(html, username) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url = m[1];
    try {
      const u = new URL(url.startsWith('//') ? `https:${url}` : url, 'https://duckduckgo.com');
      const uddg = u.searchParams.get('uddg');
      if (uddg) url = decodeURIComponent(uddg);
    } catch {}
    url = normalizeUrl(url);
    if (!url || !isUsefulUrl(url)) continue;
    const title = cleanText(m[2]);
    let score = 0;
    if (hasUsername(url, username)) score += 10;
    if (hasUsername(title, username)) score += 5;
    if (!score) continue;
    out.push({ title, url, snippet: '', engine: 'DuckDuckGo', searchScore: score });
  }
  return out;
}

async function directSearch(username) {
  try {
    const q = `"${username}" OR "@${username}"`;
    const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: browserHeaders });
    if (!res.ok) return [];
    return parseDuck(await res.text(), username);
  } catch {
    return [];
  }
}

function dedupe(items) {
  const map = new Map();
  for (const item of items) {
    const url = normalizeUrl(item?.url || '');
    if (!url || !isUsefulUrl(url)) continue;
    const key = url.toLowerCase();
    const prev = map.get(key);
    if (!prev || (item.searchScore || 0) > (prev.searchScore || 0)) map.set(key, { ...item, url });
  }
  return [...map.values()].sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
}

async function discover(username) {
  const key = username.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.results;

  const settled = await Promise.allSettled([readerSearch(username), directSearch(username)]);
  const combined = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const results = dedupe(combined).slice(0, MAX_RESULTS);
  if (results.length) cache.set(key, { at: Date.now(), results });
  return results;
}

function extractTitle(html, fallback = '') {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || fallback);
}

function extractLinksFromHtml(html, baseUrl, username) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = normalizeUrl(m[1], baseUrl);
    if (!url || !isUsefulUrl(url)) continue;
    const label = cleanText(m[2]);
    if (!hasUsername(url, username) && !hasUsername(label, username)) continue;
    out.push({ title: label || hostOf(url), url, snippet: '', engine: 'Page link', searchScore: hasUsername(url, username) ? 10 : 5 });
    if (out.length >= 10) break;
  }
  return out;
}

async function inspectDirect(item, username) {
  try {
    const res = await fetchWithTimeout(item.url, { headers: browserHeaders }, PAGE_TIMEOUT);
    if (!res.ok && res.status >= 400) return null;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('text') && !type.includes('html')) return null;
    const html = (await res.text()).slice(0, 450000);
    const finalUrl = normalizeUrl(res.url || item.url);
    const title = extractTitle(html, item.title);
    const text = cleanText(html);
    const hits = countUsername(`${finalUrl} ${title} ${text}`, username);
    if (!hits) return null;

    const score = (hasUsername(finalUrl, username) ? 12 : 0) + (hasUsername(title, username) ? 6 : 0) + Math.min(10, hits);
    return {
      ...item,
      url: finalUrl || item.url,
      title: title || item.title || hostOf(finalUrl),
      snippet: contextAround(text, username) || item.snippet || '',
      status: 'found',
      statusCode: res.status,
      deepScore: score + (item.searchScore || 0),
      hits,
      linked: extractLinksFromHtml(html, finalUrl, username)
    };
  } catch {
    return null;
  }
}

async function inspectReader(item, username) {
  try {
    const res = await fetchWithTimeout(`https://r.jina.ai/${item.url}`, {
      headers: { 'accept': 'text/plain', 'user-agent': 'Plexity/4.1' }
    }, READER_TIMEOUT);
    if (!res.ok) return null;
    const text = (await res.text()).slice(0, 350000);
    const hits = countUsername(`${item.url} ${text}`, username);
    if (!hits) return null;
    return {
      ...item,
      title: item.title || hostOf(item.url),
      snippet: contextAround(text, username),
      status: 'found',
      deepScore: (hasUsername(item.url, username) ? 12 : 0) + Math.min(10, hits) + (item.searchScore || 0),
      hits,
      linked: parseMarkdownLinks(text, username, 'Page link').slice(0, 6)
    };
  } catch {
    return null;
  }
}

async function inspectCandidates(items, username) {
  const chosen = items.slice(0, MAX_INSPECT);
  const direct = await Promise.allSettled(chosen.map(item => inspectDirect(item, username)));
  const out = [];
  const fallbackItems = [];

  for (let i = 0; i < chosen.length; i++) {
    const value = direct[i].status === 'fulfilled' ? direct[i].value : null;
    if (value) out.push(value);
    else if (fallbackItems.length < MAX_READER_FALLBACKS) fallbackItems.push(chosen[i]);
  }

  if (fallbackItems.length) {
    const reader = await Promise.allSettled(fallbackItems.map(item => inspectReader(item, username)));
    for (const result of reader) {
      if (result.status === 'fulfilled' && result.value) out.push(result.value);
    }
  }

  return out;
}

function toUiResult(result) {
  return {
    site: result.title || hostOf(result.url) || 'Web result',
    title: result.title || '',
    url: result.url,
    snippet: result.snippet || '',
    engine: result.engine || 'Web',
    status: result.status || 'unknown',
    statusCode: result.statusCode || null,
    score: result.deepScore || result.searchScore || 0,
    hits: result.hits || 0
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
    const discovered = await discover(username);
    if (!discovered.length) {
      return json({ username, checked: 0, found: 0, unknown: 0, results: [], source: 'web discovery returned no candidates' });
    }

    const firstHop = await inspectCandidates(discovered, username);
    const secondCandidates = dedupe(firstHop.flatMap(r => r.linked || []))
      .filter(link => !firstHop.some(r => normalizeUrl(r.url).toLowerCase() === normalizeUrl(link.url).toLowerCase()))
      .slice(0, 3);

    let secondHop = [];
    if (secondCandidates.length) secondHop = await inspectCandidates(secondCandidates, username);

    const merged = dedupe([...firstHop, ...secondHop]);
    const results = merged
      .filter(r => r.status === 'found')
      .sort((a, b) => (b.deepScore || 0) - (a.deepScore || 0))
      .slice(0, 40)
      .map(toUiResult);

    return json({
      username,
      checked: discovered.length,
      found: results.length,
      unknown: Math.max(0, discovered.length - results.length),
      results,
      source: 'parallel Reader-assisted web discovery + bounded page inspection'
    });
  } catch (error) {
    console.error(error);
    return json({ error: error?.message || 'Search failed' }, 500);
  }
};