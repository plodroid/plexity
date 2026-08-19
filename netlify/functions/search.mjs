const SHERLOCK_DATA = 'https://raw.githubusercontent.com/sherlock-project/sherlock/master/sherlock_project/resources/data.json';
const CACHE_MS = 60 * 60 * 1000;
const CONCURRENCY = 44;
const PER_SITE_TIMEOUT = 4500;

let siteCache = { at: 0, data: null };

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

function normalizeUrl(url = '') {
  try {
    const u = new URL(url);
    u.hash = '';
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
  } catch {
    return String(url).replace(/\/+$/, '').toLowerCase();
  }
}

async function getSites() {
  if (siteCache.data && Date.now() - siteCache.at < CACHE_MS) return siteCache.data;
  const res = await fetch(SHERLOCK_DATA, { headers: { 'user-agent': 'Plexity/2.0' } });
  if (!res.ok) throw new Error(`Could not load Sherlock site data (${res.status})`);
  const data = await res.json();
  siteCache = { at: Date.now(), data };
  return data;
}

function usernameAllowed(config, username) {
  if (!config.regexCheck) return true;
  try { return new RegExp(config.regexCheck).test(username); }
  catch { return true; }
}

async function scanSite(site, config, username) {
  const profileUrl = fill(config.url, username);
  if (!profileUrl || !usernameAllowed(config, username)) {
    return { site, url: profileUrl || config.urlMain || '#', status: 'notfound', reason: 'invalid_username' };
  }

  const probeUrl = fill(config.urlProbe || config.url, username);
  const method = String(config.request_method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'HEAD'].includes(method)) {
    return { site, url: profileUrl, status: 'unknown', reason: 'unsupported_method' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_SITE_TIMEOUT);

  try {
    const headers = {
      'user-agent': 'Mozilla/5.0 (compatible; Plexity/2.0; public username checker)',
      'accept-language': 'en-US,en;q=0.8',
      ...(fill(config.headers || {}, username))
    };

    const init = { method, headers, redirect: 'follow', signal: controller.signal };
    if (method === 'POST' && config.request_payload) {
      init.body = JSON.stringify(fill(config.request_payload, username));
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(probeUrl, init);
    const statusCode = res.status;
    const errorType = config.errorType;

    if (errorType === 'status_code') {
      if (statusCode === 404 || statusCode === 410) return { site, url: profileUrl, status: 'notfound', statusCode };
      if (statusCode >= 200 && statusCode < 400) return { site, url: profileUrl, status: 'found', statusCode };
      return { site, url: profileUrl, status: 'unknown', statusCode };
    }

    if (errorType === 'response_url') {
      const finalUrl = normalizeUrl(res.url);
      const errorUrl = normalizeUrl(fill(config.errorUrl || '', username));
      if (errorUrl && (finalUrl === errorUrl || finalUrl.startsWith(`${errorUrl}?`))) {
        return { site, url: profileUrl, status: 'notfound', statusCode };
      }
      if (statusCode >= 200 && statusCode < 400) return { site, url: profileUrl, status: 'found', statusCode };
      return { site, url: profileUrl, status: 'unknown', statusCode };
    }

    if (errorType === 'message') {
      const body = await res.text();
      const messages = Array.isArray(config.errorMsg) ? config.errorMsg : [config.errorMsg].filter(Boolean);
      const missing = messages.some(msg => body.includes(fill(String(msg), username)));
      if (missing) return { site, url: profileUrl, status: 'notfound', statusCode };
      if (statusCode >= 200 && statusCode < 400) return { site, url: profileUrl, status: 'found', statusCode };
      return { site, url: profileUrl, status: 'unknown', statusCode };
    }

    return { site, url: profileUrl, status: 'unknown', statusCode, reason: 'unknown_detection' };
  } catch (error) {
    return {
      site,
      url: profileUrl,
      status: 'unknown',
      reason: error?.name === 'AbortError' ? 'timeout' : 'network_error'
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(entries, username) {
  const out = new Array(entries.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= entries.length) return;
      const [site, config] = entries[i];
      out[i] = await scanSite(site, config, username);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const username = String(body?.username || '').trim().replace(/^@+/, '').slice(0, 64);
  if (!username) return json({ error: 'Missing username' }, 400);

  try {
    const data = await getSites();
    const entries = Object.entries(data).filter(([, config]) =>
      config &&
      !config.isNSFW &&
      config.url &&
      config.errorType &&
      !config.isDisabled
    );

    const scanned = await runPool(entries, username);
    const order = { found: 0, unknown: 1, notfound: 2 };
    scanned.sort((a, b) => order[a.status] - order[b.status] || a.site.localeCompare(b.site));

    return json({
      username,
      checked: scanned.length,
      found: scanned.filter(r => r.status === 'found').length,
      unknown: scanned.filter(r => r.status === 'unknown').length,
      results: scanned,
      source: 'Sherlock Project public site definitions'
    });
  } catch (error) {
    console.error(error);
    return json({ error: error?.message || 'Scanner failed' }, 500);
  }
};

export const config = { path: '/api/search' };
