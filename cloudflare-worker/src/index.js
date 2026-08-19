const SITES = [
  { site: 'GitHub', url: 'https://github.com/{u}' },
  { site: 'YouTube', url: 'https://www.youtube.com/@{u}', missing: ['This page isn’t available', 'This page isn\'t available'] },
  { site: 'TikTok', url: 'https://www.tiktok.com/@{u}', missing: ["Couldn't find this account", 'Couldn’t find this account'] },
  { site: 'Reddit', url: 'https://www.reddit.com/user/{u}/' },
  { site: 'Twitch', url: 'https://www.twitch.tv/{u}', missing: ["Unless you’ve got a time machine", "Unless you've got a time machine"] },
  { site: 'GitLab', url: 'https://gitlab.com/{u}' },
  { site: 'Codeberg', url: 'https://codeberg.org/{u}' },
  { site: 'DEV Community', url: 'https://dev.to/{u}' },
  { site: 'Medium', url: 'https://medium.com/@{u}' },
  { site: 'SoundCloud', url: 'https://soundcloud.com/{u}' },
  { site: 'Pinterest', url: 'https://www.pinterest.com/{u}/' },
  { site: 'Instagram', url: 'https://www.instagram.com/{u}/', ambiguous: true },
  { site: 'X', url: 'https://x.com/{u}', ambiguous: true },
  { site: 'Threads', url: 'https://www.threads.net/@{u}', ambiguous: true },
  { site: 'Telegram', url: 'https://t.me/{u}', missing: ['If you have Telegram, you can contact'] },
  { site: 'Keybase', url: 'https://keybase.io/{u}' },
  { site: 'Kaggle', url: 'https://www.kaggle.com/{u}' },
  { site: 'Docker Hub', url: 'https://hub.docker.com/u/{u}' },
  { site: 'npm', url: 'https://www.npmjs.com/~{u}' },
  { site: 'Replit', url: 'https://replit.com/@{u}' },
  { site: 'Scratch', url: 'https://scratch.mit.edu/users/{u}/' },
  { site: 'Vimeo', url: 'https://vimeo.com/{u}' },
  { site: 'Behance', url: 'https://www.behance.net/{u}' },
  { site: 'Dribbble', url: 'https://dribbble.com/{u}' },
  { site: 'Flickr', url: 'https://www.flickr.com/people/{u}/' },
  { site: 'Last.fm', url: 'https://www.last.fm/user/{u}' },
  { site: 'Letterboxd', url: 'https://letterboxd.com/{u}/' },
  { site: 'Chess.com', url: 'https://www.chess.com/member/{u}' },
  { site: 'Lichess', url: 'https://lichess.org/@/{u}' },
  { site: 'Linktree', url: 'https://linktr.ee/{u}' },
  { site: 'Ko-fi', url: 'https://ko-fi.com/{u}' },
  { site: 'Buy Me a Coffee', url: 'https://www.buymeacoffee.com/{u}' },
  { site: 'Patreon', url: 'https://www.patreon.com/{u}', ambiguous: true },
  { site: 'itch.io', url: 'https://{u}.itch.io/' },
  { site: 'About.me', url: 'https://about.me/{u}' }
];

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

function cleanUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 64);
}

function profileUrl(template, username) {
  return template.replaceAll('{u}', encodeURIComponent(username));
}

async function probe(def, username) {
  const url = profileUrl(def.url, username);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PlexityPublicProfileScanner/1.0)',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.8'
      }
    });

    if (response.status === 404 || response.status === 410) {
      return { site: def.site, url, status: 'notfound', httpStatus: response.status };
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      return { site: def.site, url, status: 'possible', httpStatus: response.status };
    }

    if (!response.ok) {
      return { site: def.site, url, status: 'possible', httpStatus: response.status };
    }

    let text = '';
    try {
      text = (await response.text()).slice(0, 220000);
    } catch {}

    if ((def.missing || []).some((needle) => text.toLowerCase().includes(needle.toLowerCase()))) {
      return { site: def.site, url, status: 'notfound', httpStatus: response.status };
    }

    return {
      site: def.site,
      url,
      status: def.ambiguous ? 'possible' : 'found',
      httpStatus: response.status
    };
  } catch {
    return { site: def.site, url, status: 'possible', httpStatus: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

async function scan(username) {
  const results = await Promise.all(SITES.map((site) => probe(site, username)));
  const rank = { found: 0, possible: 1, notfound: 2 };
  return results.sort((a, b) => rank[a.status] - rank[b.status] || a.site.localeCompare(b.site));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return json({ ok: true });

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({ ok: true, service: 'plexity-public-profile-search', sites: SITES.length });
    }

    if (url.pathname !== '/api/search') return json({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const username = cleanUsername(body?.username);
    if (username.length < 1) return json({ error: 'Enter a valid username.' }, 400);

    const results = await scan(username);
    return json({
      username,
      checked: results.length,
      found: results.filter((r) => r.status === 'found').length,
      possible: results.filter((r) => r.status === 'possible').length,
      results
    });
  }
};
