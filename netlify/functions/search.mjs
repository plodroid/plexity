const SHERLOCK_DATA = 'https://raw.githubusercontent.com/sherlock-project/sherlock/master/sherlock_project/resources/data.json';
const SEARX_SPACE = 'https://searx.space/data/instances.json';
const CACHE_MS = 60 * 60 * 1000;
const SEARCH_TIMEOUT = 6500;
const VERIFY_TIMEOUT = 3500;
const VERIFY_CONCURRENCY = 18;

let sherlockCache = { at: 0, data: null };
let searxCache = { at: 0, data: null };

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

function fill(value, username) {
  if (typeof value === 'string') return value.replaceAll('{}', username);
  if (Array.isArray(value)) return value.map(v => fill(v, username));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, username)]));
  }
  return value;
}

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

function keyOf(url = '') {
  return normalizeUrl(url).toLowerCase();
}

function hostOf(url = '') {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function decodeDuckUrl(raw = '') {
  try {
    const value = raw.startsWith('//') ? `https:${raw}` : raw;
    const u = new URL(value, 'https://duckduckgo.com');
    const target = u.searchParams.get('uddg');
    return normalizeUrl(target ? decodeURIComponent(target) : u.href);
  } catch {
    return normalizeUrl(raw);
  }
}

function isUsefulUrl(url = '') {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    return ![
      'duckduckgo.com', 'html.duckduckgo.com', 'lite.duckduckgo.com',
      'bing.com', 'www.bing.com', 'google.com', 'www.google.com',
      'search.yahoo.com', 'r.search.yahoo.com'
    ].includes(host);
  } catch {
    return false;
  }
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

async function getSherlockSites() {
  if (sherlockCache.data && Date.now() - sherlockCache.at < CACHE_MS) return sherlockCache.data;
  const res = await fetchWithTimeout(SHERLOCK_DATA, { headers: { 'user-agent': 'Plexity/3.0' } }, 7000);
  if (!res.ok) throw new Error(`Could not load Sherlock site data (${res.status})`);
  const data = await res.json();
  sherlockCache = { at: Date.now(), data };
  return data;
}

async function getSearxInstances() {
  if (searxCache.data && Date.now() - searxCache.at < CACHE_MS) return searxCache.data;
  try {
    const res = await fetchWithTimeout(SEARX_SPACE, { headers: { 'user-agent': 'Plexity/3.0' } }, 7000);
    if (!res.ok) return [];
    const data = await res.json();
    const instances = Object.entries(data?.instances || {})
      .filter(([url, info]) =>
        url.startsWith('https://') &&
        info?.network_type === 'normal' &&
        info?.http?.status_code === 200 &&
        !info?.http?.error &&
        String(info?.generator || '').toLowerCase().includes('searx')
      )
      .map(([url]) => url.replace(/\/+$/, ''))
      .slice(0, 18);
    searxCache = { at: Date.now(), data: instances };
    return instances;
  } catch {
    return [];
  }
}

function parseDuckDuckGo(html) {
  const out = [];
  const matches = [...html.matchAll(/<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const match of matches) {
    const url = decodeDuckUrl(match[1]);
    if (!isUsefulUrl(url)) continue;
    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 2200);
    const snippet = after.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div|td)>/i)?.[1] || '';
    out.push({ title: cleanHtml(match[2]), url, snippet: cleanHtml(snippet), engine: 'DuckDuckGo' });
  }
  return out;
}

function parseBing(html) {
  const out = [];
  const blocks = html.split(/<li[^>]+class=["'][^"']*b_algo[^"']*["'][^>]*>/i).slice(1);
  for (const block of blocks) {
    const link = block.match(/<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const url = normalizeUrl(link[1]);
    if (!isUsefulUrl(url)) continue;
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    out.push({ title: cleanHtml(link[2]), url, snippet: cleanHtml(snippet), engine: 'Bing' });
  }
  return out;
}

async function searchDuck(query) {
  try {
    const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return [];
    return parseDuckDuckGo(await res.text());
  } catch {
    return [];
  }
}

async function searchBing(query) {
  try {
    const res = await fetchWithTimeout(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=25`, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) return [];
    return parseBing(await res.text());
  } catch {
    return [];
  }
}

async function searchSearx(query) {
  const instances = await getSearxInstances();
  for (const base of instances.slice(0, 6)) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&categories=general&safesearch=1&language=auto`;
      const res = await fetchWithTimeout(url, { headers: { 'user-agent': 'Plexity/3.0' } }, 5200);
      if (!res.ok) continue;
      const data = await res.json();
      const results = (data?.results || []).map(r => ({
        title: cleanHtml(r.title || ''),
        url: normalizeUrl(r.url || ''),
        snippet: cleanHtml(r.content || ''),
        engine: r.engine ? `SearXNG · ${r.engine}` : 'SearXNG'
      })).filter(r => isUsefulUrl(r.url));
      if (results.length) return results;
    } catch {}
  }
  return [];
}

function scoreWebResult(result, username) {
  const needle = username.toLowerCase();
  const url = result.url.toLowerCase();
  const title = result.title.toLowerCase();
  const snippet = result.snippet.toLowerCase();
  let score = 0;

  if (url.includes(`@${needle}`)) score += 8;
  if (url.includes(`/${needle}`)) score += 7;
  if (url.includes(`=${needle}`)) score += 5;
  if (hostOf(url).split('.')[0] === needle) score += 5;
  if (title.includes(`@${needle}`)) score += 5;
  if (title.includes(needle)) score += 4;
  if (snippet.includes(`@${needle}`)) score += 3;
  if (snippet.includes(needle)) score += 2;

  try {
    const u = new URL(result.url);
    const segments = u.pathname.toLowerCase().split('/').filter(Boolean).map(s => decodeURIComponent(s));
    if (segments.some(s => s === needle || s === `@${needle}`)) score += 5;
  } catch {}

  return score;
}

function dedupeWeb(items, username) {
  const best = new Map();
  for (const item of items) {
    if (!item?.url || !isUsefulUrl(item.url)) continue;
    const score = scoreWebResult(item, username);
    if (score < 2) continue;
    const key = keyOf(item.url);
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { ...item, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 45);
}

async function searchWeb(username) {
  const exact = `"${username}"`;
  const atExact = `"@${username}"`;
  const inUrl = `inurl:${username}`;

  const [searxExact, searxAt] = await Promise.all([
    searchSearx(exact),
    searchSearx(atExact)
  ]);

  let combined = [...searxExact, ...searxAt];
  if (combined.length < 12) {
    const [duckExact, duckAt, bingExact, bingUrl] = await Promise.all([
      searchDuck(exact),
      searchDuck(atExact),
      searchBing(exact),
      searchBing(inUrl)
    ]);
    combined.push(...duckExact, ...duckAt, ...bingExact, ...bingUrl);
  }

  return dedupeWeb(combined, username);
}

function usernameAllowed(config, username) {
  if (!config?.regexCheck) return true;
  try { return new RegExp(config.regexCheck).test(username); }
  catch { return true; }
}

function siteHost(config, username) {
  try { return hostOf(fill(config?.urlMain || config?.url || '', username)); }
  catch { return ''; }
}

async function verifySherlockSite(site, config, username) {
  const profileUrl = fill(config.url, username);
  if (!profileUrl || !usernameAllowed(config, username)) return null;

  const probeUrl = fill(config.urlProbe || config.url, username);
  const method = String(config.request_method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'HEAD'].includes(method)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT);
  try {
    const headers = {
      'user-agent': 'Mozilla/5.0 (compatible; Plexity/3.0; public username discovery)',
      'accept-language': 'en-US,en;q=0.8',
      ...(fill(config.headers || {}, username))
    };
    const init = { method, headers, redirect: 'follow', signal: controller.signal };
    if (method === 'POST' && config.request_payload) {
      init.body = JSON.stringify(fill(config.request_payload, username));
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(probeUrl, init);
    const code = res.status;
    const type = config.errorType;

    if (type === 'status_code') {
      if (code >= 200 && code < 400) return { site, url: profileUrl, status: 'found', statusCode: code, source: 'Sherlock verification' };
      return null;
    }

    if (type === 'response_url') {
      const finalUrl = keyOf(res.url);
      const errorUrl = keyOf(fill(config.errorUrl || '', username));
      if (errorUrl && (finalUrl === errorUrl || finalUrl.startsWith(`${errorUrl}?`))) return null;
      if (code >= 200 && code < 400) return { site, url: profileUrl, status: 'found', statusCode: code, source: 'Sherlock verification' };
      return null;
    }

    if (type === 'message') {
      const body = await res.text();
      const messages = Array.isArray(config.errorMsg) ? config.errorMsg : [config.errorMsg].filter(Boolean);
      if (messages.some(msg => body.includes(fill(String(msg), username)))) return null;
      if (code >= 200 && code < 400) return { site, url: profileUrl, status: 'found', statusCode: code, source: 'Sherlock verification' };
    }
  } catch {}
  finally { clearTimeout(timer); }
  return null;
}

async function verifyLikelyProfiles(username, webResults) {
  let data;
  try { data = await getSherlockSites(); }
  catch { return []; }

  const discoveredHosts = new Set(webResults.map(r => hostOf(r.url)).filter(Boolean));
  const priority = new Set([
    'github', 'youtube', 'reddit', 'twitch', 'tiktok', 'instagram', 'twitter', 'x',
    'gitlab', 'codeberg', 'soundcloud', 'pinterest', 'steam', 'namemc', 'replit',
    'scratch', 'keybase', 'telegram', 'linktree', 'itch.io', 'chess.com', 'lichess'
  ]);

  const entries = Object.entries(data).filter(([site, config]) => {
    if (!config || config.isNSFW || config.isDisabled || !config.url || !config.errorType) return false;
    const host = siteHost(config, username);
    const name = site.toLowerCase();
    return discoveredHosts.has(host) || [...priority].some(p => name.includes(p));
  }).slice(0, 70);

  const out = [];
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= entries.length) return;
      const [site, config] = entries[i];
      const result = await verifySherlockSite(site, config, username);
      if (result) out.push(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(VERIFY_CONCURRENCY, entries.length) }, worker));
  return out;
}

function toUiResult(result, username) {
  const score = result.score ?? scoreWebResult(result, username);
  return {
    site: result.site || result.title || hostOf(result.url) || 'Web result',
    title: result.title || result.site || '',
    url: result.url,
    snippet: result.snippet || '',
    engine: result.engine || result.source || 'Web',
    status: result.status || (score >= 7 ? 'found' : 'unknown'),
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
    const webResults = await searchWeb(username);
    const verified = await verifyLikelyProfiles(username, webResults);

    const merged = new Map();
    for (const item of [...verified, ...webResults.map(r => toUiResult(r, username))]) {
      const ui = toUiResult(item, username);
      const key = keyOf(ui.url);
      const prev = merged.get(key);
      if (!prev || (ui.status === 'found' && prev.status !== 'found') || ui.score > prev.score) merged.set(key, ui);
    }

    const order = { found: 0, unknown: 1 };
    const results = [...merged.values()]
      .filter(r => r.status === 'found' || r.status === 'unknown')
      .sort((a, b) => (order[a.status] - order[b.status]) || (b.score - a.score) || a.site.localeCompare(b.site))
      .slice(0, 60);

    return json({
      username,
      checked: results.length,
      found: results.filter(r => r.status === 'found').length,
      unknown: results.filter(r => r.status === 'unknown').length,
      results,
      source: 'public web search + Sherlock verification'
    });
  } catch (error) {
    console.error(error);
    return json({ error: error?.message || 'Search failed' }, 500);
  }
};

export const config = { path: '/api/search' };
