const SEARCH_TIMEOUT = 4200;
const PAGE_TIMEOUT = 3000;
const MAX_SEARCH_RESULTS = 70;
const MAX_FIRST_HOP = 28;
const MAX_SECOND_HOP = 18;
const MAX_BODY_BYTES = 700_000;

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
  const needle = username.toLowerCase();
  const title = String(result.title || '').toLowerCase();
  const snippet = String(result.snippet || '').toLowerCase();
  const url = String(result.url || '').toLowerCase();
  let score = 0;
  if (url.includes(needle)) score += 4;
  if (url.includes(`@${needle}`)) score += 4;
  if (title.includes(needle)) score += 2;
  if (snippet.includes(needle)) score += 1;
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

async function searchWeb(username) {
  const queries = [
    `"${username}"`,
    `"@${username}"`,
    `${username} profile`,
    `${username} account`,
    `${username} username`,
    `inurl:${username} ${username}`
  ];
  const jobs = [];
  for (const q of queries) jobs.push(searchDuck(q), searchBing(q), searchYahoo(q));
  const settled = await Promise.allSettled(jobs);
  return dedupeSearch(settled.flatMap(r => r.status === 'fulfilled' ? r.value : []), username);
}

function countNeedle(text, username) {
  const hay = String(text || '').toLowerCase();
  const needle = username.toLowerCase();
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = hay.indexOf(needle, pos)) !== -1 && count < 100) {
    count++;
    pos += needle.length;
  }
  return count;
}

function contextAround(text, username, radius = 120) {
  const source = cleanHtml(text);
  const lower = source.toLowerCase();
  const i = lower.indexOf(username.toLowerCase());
  if (i < 0) return '';
  const start = Math.max(0, i - radius);
  const end = Math.min(source.length, i + username.length + radius);
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
  const needle = username.toLowerCase();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = normalizeUrl(m[1], baseUrl);
    if (!isUsefulUrl(url)) continue;
    const label = cleanHtml(m[2]);
    const hay = `${url} ${label}`.toLowerCase();
    if (!hay.includes(needle)) continue;
    out.push({ url, title: label || hostOf(url), snippet: '', engine: 'Page link' });
    if (out.length >= 30) break;
  }
  return out;
}

function evidenceScore({ finalUrl, rawHtml, text, title, description, canonical, ogUrl }, username) {
  const needle = username.toLowerCase();
  let score = 0;
  const locations = [];

  const add = (name, value, points) => {
    if (String(value || '').toLowerCase().includes(needle)) {
      score += points;
      locations.push(name);
    }
  };

  add('url', finalUrl, 8);
  add('canonical', canonical, 7);
  add('og:url', ogUrl, 6);
  add('title', title, 5);
  add('description', description, 3);

  const textHits = countNeedle(text, username);
  const htmlHits = countNeedle(rawHtml, username);
  if (textHits) {
    score += Math.min(10, 3 + textHits);
    locations.push('page text');
  }
  if (!textHits && htmlHits) {
    score += Math.min(6, 2 + htmlHits);
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
    if (!prev || normalized.status === 'found' && prev.status !== 'found' || score > (prev.deepScore || 0)) map.set(key, normalized);
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

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const username = String(body?.username || '').trim().replace(/^@+/, '').slice(0, 64);
  if (!username) return json({ error: 'Missing username' }, 400);

  try {
    const discovered = await searchWeb(username);
    const firstHop = await inspectBatch(discovered, username, MAX_FIRST_HOP);

    const linkedCandidates = dedupeSearch(
      firstHop.flatMap(r => r.linked || []),
      username
    ).filter(link => !firstHop.some(r => normalizeUrl(r.url).toLowerCase() === normalizeUrl(link.url).toLowerCase()));

    const secondHop = await inspectBatch(linkedCandidates, username, MAX_SECOND_HOP);
    const merged = mergeResults([...firstHop, ...secondHop], username);

    // Keep actual deep matches first. Search-only/blocked pages remain Unclear instead of being faked as Found.
    const results = merged
      .filter(r => r.status === 'found' || (r.searchScore || 0) >= 4)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'found' ? -1 : 1;
        return (b.deepScore || 0) - (a.deepScore || 0);
      })
      .slice(0, 60)
      .map(toUiResult);

    return json({
      username,
      checked: firstHop.length + secondHop.length,
      found: results.filter(r => r.status === 'found').length,
      unknown: results.filter(r => r.status === 'unknown').length,
      results,
      source: 'web search + full-page deep scan + one-hop matching links'
    });
  } catch (error) {
    console.error(error);
    return json({ error: error?.message || 'Search failed' }, 500);
  }
};
