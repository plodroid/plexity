const SEARCH_TIMEOUT = 4200;
const PAGE_TIMEOUT = 3000;
const MAX_SEARCH_RESULTS = 80;
const MAX_FIRST_HOP = 30;
const MAX_SECOND_HOP = 20;
const MAX_BODY_BYTES = 700_000;
const CACHE_TTL = 30 * 60 * 1000;
const STALE_CACHE_TTL = 6 * 60 * 60 * 1000;

const resultCache = new Map();

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
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
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

function normalizeUrl(url = '', base) {
  try {
    const u = new URL(url, base);
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
  'accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.6'
};

async function readLimited(res, maxBytes = MAX_BODY_BYTES) {
  const length = Number(res.headers.get('content-length') || 0);
  if (length && length > maxBytes * 2) return '';
  if (!res.body?.getReader) return (await res.text()).slice(0, maxBytes);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    while (total < maxBytes) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (total >= maxBytes) break;
    }
    text += decoder.decode();
  } finally {
    try { await reader.cancel(); } catch {}
  }
  return text.slice(0, maxBytes);
}

function decodeMaybe(value = '') {
  let out = String(value || '');
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch { break; }
  }
  return out;
}

function usernamePattern(username) {
  const escaped = String(username).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9._-])@?${escaped}(?=$|[^a-z0-9._-])`, 'i');
}

function hasUsername(value, username) {
  if (!value) return false;
  const decoded = decodeMaybe(String(value)).replace(/\\u002f/gi, '/').replace(/\\u0040/gi, '@');
  return usernamePattern(username).test(decoded);
}

function exactUrlUsernameScore(url, username) {
  try {
    const u = new URL(url);
    const needle = username.toLowerCase();
    let score = 0;
    const hostParts = u.hostname.toLowerCase().split('.');
    if (hostParts.includes(needle)) score += 9;
    const segments = u.pathname.split('/').filter(Boolean).map(x => decodeMaybe(x).toLowerCase());
    if (segments.some(s => s === needle || s === `@${needle}`)) score += 10;
    for (const [k, v] of u.searchParams) {
      if (decodeMaybe(v).toLowerCase() === needle) score += 8;
      if (decodeMaybe(k).toLowerCase() === needle) score += 4;
    }
    return score;
  } catch { return 0; }
}

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

function baseSearchScore(result, username) {
  let score = exactUrlUsernameScore(result.url, username);
  if (hasUsername(result.url, username)) score += 5;
  if (hasUsername(result.title, username)) score += 4;
  if (hasUsername(result.snippet, username)) score += 3;
  return score;
}

function dedupeSearch(items, username) {
  const map = new Map();
  for (const item of items) {
    if (!item?.url || !isUsefulUrl(item.url)) continue;
    const key = normalizeUrl(item.url).toLowerCase();
    const score = baseSearchScore(item, username);
    const prev = map.get(key);
    if (!prev || score > prev.searchScore) map.set(key, { ...item, searchScore: score });
  }
  return [...map.values()]
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, MAX_SEARCH_RESULTS);
}

async function runSearchJobs(jobs) {
  const settled = await Promise.allSettled(jobs);
  return settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

async function searchWeb(username) {
  // Stage 1: only three requests. Hammering public engines with dozens of
  // parallel requests causes their anti-bot systems to block later searches.
  let combined = await runSearchJobs([
    searchDuck(username),
    searchBing(`"${username}"`),
    searchYahoo(`@${username}`)
  ]);

  let deduped = dedupeSearch(combined, username);
  if (deduped.length >= 12) return deduped;

  // Stage 2: a small fallback batch only when discovery is weak.
  combined.push(...await runSearchJobs([
    searchDuck(`"@${username}"`),
    searchBing(`${username} profile`),
    searchYahoo(`"${username}"`)
  ]));

  deduped = dedupeSearch(combined, username);
  if (deduped.length >= 8) return deduped;

  // Stage 3: last-resort targeted queries. Still far below the old 33-request burst.
  combined.push(...await runSearchJobs([
    searchDuck(`inurl:${username}`),
    searchBing(`${username} account`),
    searchYahoo(`${username} username`)
  ]));

  return dedupeSearch(combined, username);
}

function countNeedle(text, username) {
  const source = decodeMaybe(String(text || ''));
  const pattern = usernamePattern(username);
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const global = new RegExp(pattern.source, flags);
  let count = 0;
  while (global.exec(source) && count < 100) count++;
  return count;
}

function contextAround(text, username, radius = 130) {
  const source = cleanHtml(text);
  const match = source.match(usernamePattern(username));
  if (!match || match.index == null) return '';
  const i = match.index;
  const start = Math.max(0, i - radius);
  const end = Math.min(source.length, i + match[0].length + radius);
  return `${start ? '…' : ''}${source.slice(start, end).trim()}${end < source.length ? '…' : ''}`;
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`, 'i'));
  return cleanHtml(a?.[1] || b?.[1] || '');
}

function extractLinks(html, baseUrl, username) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const url = normalizeUrl(m[2], baseUrl);
    if (!isUsefulUrl(url)) continue;
    const label = cleanHtml(m[4]);
    const attrs = `${m[1]} ${m[3]}`;
    if (!hasUsername(url, username) && !hasUsername(label, username) && !hasUsername(attrs, username)) continue;
    out.push({ url, title: label || hostOf(url), snippet: '', engine: 'Page link' });
    if (out.length >= 40) break;
  }
  return out;
}

function evidenceScore({ finalUrl, rawHtml, text, title, description, canonical, ogUrl }, username) {
  let score = exactUrlUsernameScore(finalUrl, username);
  const locations = [];
  const add = (name, value, points) => {
    if (hasUsername(value, username)) {
      score += points;
      locations.push(name);
    }
  };
  add('url', finalUrl, 7);
  add('canonical', canonical, 7);
  add('og:url', ogUrl, 6);
  add('title', title, 5);
  add('description', description, 3);
  const textHits = countNeedle(text, username);
  const htmlHits = countNeedle(rawHtml, username);
  if (textHits) {
    score += Math.min(12, 3 + textHits);
    locations.push('page text');
  }
  if (!textHits && htmlHits) {
    score += Math.min(8, 2 + htmlHits);
    locations.push('page source');
  }
  return { score, locations: [...new Set(locations)], hits: Math.max(textHits, htmlHits) };
}

async function inspectPage(result, username) {
  try {
    const res = await fetchWithTimeout(result.url, { headers: browserHeaders }, PAGE_TIMEOUT);
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!(type.includes('text/html') || type.includes('text/plain') || type.includes('application/xhtml'))) {
      return { ...result, status: 'unknown', deepScore: result.searchScore || 0, linked: [] };
    }
    const html = await readLimited(res);
    if (!html) return { ...result, status: 'unknown', deepScore: result.searchScore || 0, linked: [] };
    const finalUrl = normalizeUrl(res.url || result.url);
    const title = cleanHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || result.title || '');
    const description = extractMeta(html, 'description') || extractMeta(html, 'og:description') || result.snippet || '';
    const canonical = normalizeUrl(html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1] || '', finalUrl);
    const ogUrl = normalizeUrl(extractMeta(html, 'og:url') || '', finalUrl);
    const text = cleanHtml(html);
    const evidence = evidenceScore({ finalUrl, rawHtml: html, text, title, description, canonical, ogUrl }, username);
    const linked = extractLinks(html, finalUrl, username);
    const snippet = contextAround(text, username) || description || result.snippet || '';
    return {
      ...result,
      url: finalUrl || result.url,
      title: title || result.title || hostOf(finalUrl),
      snippet,
      statusCode: res.status,
      status: res.ok && evidence.score >= 5 ? 'found' : 'unknown',
      deepScore: evidence.score + (result.searchScore || 0),
      evidence: evidence.locations,
      hits: evidence.hits,
      linked
    };
  } catch {
    return { ...result, status: 'unknown', deepScore: result.searchScore || 0, linked: [] };
  }
}

async function inspectBatch(items, username, limit) {
  const chosen = items.slice(0, limit);
  const settled = await Promise.allSettled(chosen.map(item => inspectPage(item, username)));
  return settled.map((r, i) => r.status === 'fulfilled' ? r.value : { ...chosen[i], status: 'unknown', deepScore: chosen[i].searchScore || 0, linked: [] });
}

function mergeResults(items, username) {
  const map = new Map();
  for (const item of items) {
    if (!item?.url || !isUsefulUrl(item.url)) continue;
    const key = normalizeUrl(item.url).toLowerCase();
    const prev = map.get(key);
    const score = item.deepScore ?? item.searchScore ?? baseSearchScore(item, username);
    const normalized = { ...item, deepScore: score };
    if (!prev || (normalized.status === 'found' && prev.status !== 'found') || score > (prev.deepScore || 0)) map.set(key, normalized);
  }
  return [...map.values()];
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
    evidence: result.evidence || [],
    hits: result.hits || 0
  };
}

function getCached(username, maxAge = CACHE_TTL) {
  const cached = resultCache.get(username.toLowerCase());
  if (!cached || Date.now() - cached.at > maxAge) return null;
  return cached.data;
}

function setCached(username, data) {
  if (data?.results?.length) resultCache.set(username.toLowerCase(), { at: Date.now(), data });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const username = String(body?.username || '').trim().replace(/^@+/, '').slice(0, 64);
  if (!username) return json({ error: 'Missing username' }, 400);

  const freshCache = getCached(username);
  if (freshCache) return json({ ...freshCache, cached: true });

  try {
    const discovered = await searchWeb(username);

    // If every public engine suddenly returns nothing, it is usually temporary
    // throttling. Reuse a slightly older successful result rather than lying with 0.
    if (!discovered.length) {
      const stale = getCached(username, STALE_CACHE_TTL);
      if (stale) return json({ ...stale, cached: true, stale: true });
      return json({
        username,
        checked: 0,
        found: 0,
        unknown: 0,
        results: [],
        source: 'public web search engines',
        temporarilyLimited: true
      });
    }

    const firstHop = await inspectBatch(discovered, username, MAX_FIRST_HOP);
    const linkedCandidates = dedupeSearch(
      firstHop.flatMap(r => r.linked || []),
      username
    ).filter(link => !firstHop.some(r => normalizeUrl(r.url).toLowerCase() === normalizeUrl(link.url).toLowerCase()));
    const secondHop = await inspectBatch(linkedCandidates, username, MAX_SECOND_HOP);
    const merged = mergeResults([...firstHop, ...secondHop], username);
    const results = merged
      .filter(r => r.status === 'found' || (r.searchScore || 0) >= 3)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'found' ? -1 : 1;
        return (b.deepScore || 0) - (a.deepScore || 0);
      })
      .slice(0, 70)
      .map(toUiResult);

    const payload = {
      username,
      checked: firstHop.length + secondHop.length,
      found: results.filter(r => r.status === 'found').length,
      unknown: results.filter(r => r.status === 'unknown').length,
      results,
      source: 'staged web search + full-page token scan + one-hop matching links'
    };
    setCached(username, payload);
    return json(payload);
  } catch (error) {
    console.error(error);
    const stale = getCached(username, STALE_CACHE_TTL);
    if (stale) return json({ ...stale, cached: true, stale: true });
    return json({ error: error?.message || 'Search failed' }, 500);
  }
};
