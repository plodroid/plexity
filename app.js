const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  hero: $('#hero'), resultsView: $('#resultsView'), form: $('#searchForm'), input: $('#usernameInput'),
  back: $('#backBtn'), title: $('#resultTitle'), summary: $('#summary'), verifiedCount: $('#verifiedCount'),
  candidateCount: $('#candidateCount'), checkedCount: $('#checkedCount'), progressWrap: $('#progressWrap'),
  progressBar: $('#progressBar'), progressText: $('#progressText'), grid: $('#resultGrid'),
  empty: $('#emptyState'), filterInput: $('#filterInput'), themeToggle: $('#themeToggle')
};

const profileSites = [
  { site: 'GitHub', domain: 'github.com', url: u => `https://github.com/${u}`, verify: verifyGitHub },
  { site: 'GitLab', domain: 'gitlab.com', url: u => `https://gitlab.com/${u}`, verify: verifyGitLab },
  { site: 'Codeberg', domain: 'codeberg.org', url: u => `https://codeberg.org/${u}`, verify: verifyCodeberg },
  { site: 'Hacker News', domain: 'news.ycombinator.com', url: u => `https://news.ycombinator.com/user?id=${u}`, verify: verifyHackerNews },
  { site: 'Chess.com', domain: 'chess.com', url: u => `https://www.chess.com/member/${u}`, verify: verifyChess },
  { site: 'Scratch', domain: 'scratch.mit.edu', url: u => `https://scratch.mit.edu/users/${u}/`, verify: verifyScratch },
  { site: 'Keybase', domain: 'keybase.io', url: u => `https://keybase.io/${u}`, verify: verifyKeybase },
  { site: 'Reddit', domain: 'reddit.com', url: u => `https://www.reddit.com/user/${u}/`, verify: verifyReddit },
  { site: 'YouTube', domain: 'youtube.com', url: u => `https://www.youtube.com/@${u}` },
  { site: 'TikTok', domain: 'tiktok.com', url: u => `https://www.tiktok.com/@${u}` },
  { site: 'Instagram', domain: 'instagram.com', url: u => `https://www.instagram.com/${u}/` },
  { site: 'X / Twitter', domain: 'x.com', url: u => `https://x.com/${u}` },
  { site: 'Threads', domain: 'threads.net', url: u => `https://www.threads.net/@${u}` },
  { site: 'Twitch', domain: 'twitch.tv', url: u => `https://www.twitch.tv/${u}` },
  { site: 'Kick', domain: 'kick.com', url: u => `https://kick.com/${u}` },
  { site: 'Bluesky', domain: 'bsky.app', url: u => `https://bsky.app/profile/${u}.bsky.social` },
  { site: 'Mastodon.social', domain: 'mastodon.social', url: u => `https://mastodon.social/@${u}` },
  { site: 'Pinterest', domain: 'pinterest.com', url: u => `https://www.pinterest.com/${u}/` },
  { site: 'Tumblr', domain: 'tumblr.com', url: u => `https://${u}.tumblr.com/` },
  { site: 'Medium', domain: 'medium.com', url: u => `https://medium.com/@${u}` },
  { site: 'Substack', domain: 'substack.com', url: u => `https://${u}.substack.com/` },
  { site: 'SoundCloud', domain: 'soundcloud.com', url: u => `https://soundcloud.com/${u}` },
  { site: 'Spotify', domain: 'open.spotify.com', url: u => `https://open.spotify.com/user/${u}` },
  { site: 'Bandcamp', domain: 'bandcamp.com', url: u => `https://${u}.bandcamp.com/` },
  { site: 'Last.fm', domain: 'last.fm', url: u => `https://www.last.fm/user/${u}` },
  { site: 'DeviantArt', domain: 'deviantart.com', url: u => `https://www.deviantart.com/${u}` },
  { site: 'Behance', domain: 'behance.net', url: u => `https://www.behance.net/${u}` },
  { site: 'Dribbble', domain: 'dribbble.com', url: u => `https://dribbble.com/${u}` },
  { site: 'Flickr', domain: 'flickr.com', url: u => `https://www.flickr.com/people/${u}/` },
  { site: 'Letterboxd', domain: 'letterboxd.com', url: u => `https://letterboxd.com/${u}/` },
  { site: 'Steam', domain: 'steamcommunity.com', url: u => `https://steamcommunity.com/id/${u}` },
  { site: 'Roblox', domain: 'roblox.com', url: u => `https://www.roblox.com/search/users?keyword=${encodeURIComponent(u)}`, kind: 'search' },
  { site: 'Minecraft NameMC', domain: 'namemc.com', url: u => `https://namemc.com/profile/${u}` },
  { site: 'Replit', domain: 'replit.com', url: u => `https://replit.com/@${u}` },
  { site: 'Stack Overflow', domain: 'stackoverflow.com', url: u => `https://stackoverflow.com/users/filter?search=${encodeURIComponent(u)}`, kind: 'search' },
  { site: 'npm', domain: 'npmjs.com', url: u => `https://www.npmjs.com/~${u}` },
  { site: 'PyPI', domain: 'pypi.org', url: u => `https://pypi.org/user/${u}/` },
  { site: 'Docker Hub', domain: 'hub.docker.com', url: u => `https://hub.docker.com/u/${u}` },
  { site: 'Kaggle', domain: 'kaggle.com', url: u => `https://www.kaggle.com/${u}` },
  { site: 'Hugging Face', domain: 'huggingface.co', url: u => `https://huggingface.co/${u}` },
  { site: 'Product Hunt', domain: 'producthunt.com', url: u => `https://www.producthunt.com/@${u}` },
  { site: 'Linktree', domain: 'linktr.ee', url: u => `https://linktr.ee/${u}` },
  { site: 'Carrd', domain: 'carrd.co', url: u => `https://${u}.carrd.co/` },
  { site: 'Ko-fi', domain: 'ko-fi.com', url: u => `https://ko-fi.com/${u}` },
  { site: 'Patreon', domain: 'patreon.com', url: u => `https://www.patreon.com/${u}` },
  { site: 'Buy Me a Coffee', domain: 'buymeacoffee.com', url: u => `https://www.buymeacoffee.com/${u}` },
  { site: 'itch.io', domain: 'itch.io', url: u => `https://${u}.itch.io/` },
  { site: 'Game Jolt', domain: 'gamejolt.com', url: u => `https://gamejolt.com/@${u}` },
  { site: 'Telegram', domain: 't.me', url: u => `https://t.me/${u}` },
  { site: 'Vimeo', domain: 'vimeo.com', url: u => `https://vimeo.com/${u}` },
  { site: 'Dailymotion', domain: 'dailymotion.com', url: u => `https://www.dailymotion.com/${u}` },
  { site: 'About.me', domain: 'about.me', url: u => `https://about.me/${u}` }
];

let lastResults = [];
let activeFilter = 'all';
let searchRun = 0;

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
    .split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function initials(name) {
  const parts = String(name || '?').split(/\s+|\//).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2) || '?').toUpperCase();
}

async function fetchJson(url, options = {}, timeout = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let data = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyGitHub(u) {
  const r = await fetchJson(`https://api.github.com/users/${encodeURIComponent(u)}`, { headers: { accept: 'application/vnd.github+json' } });
  return r.ok && r.data?.login ? { verified: true, detail: `${r.data.login}${r.data.name ? ` · ${r.data.name}` : ''}` } : { verified: false };
}

async function verifyGitLab(u) {
  const r = await fetchJson(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`);
  const exact = Array.isArray(r.data) && r.data.find(x => String(x.username).toLowerCase() === u.toLowerCase());
  return exact ? { verified: true, detail: exact.name || exact.username } : { verified: false };
}

async function verifyCodeberg(u) {
  const r = await fetchJson(`https://codeberg.org/api/v1/users/${encodeURIComponent(u)}`);
  return r.ok && r.data?.login ? { verified: true, detail: r.data.full_name || r.data.login } : { verified: false };
}

async function verifyHackerNews(u) {
  const r = await fetchJson(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`);
  return r.ok && r.data?.id ? { verified: true, detail: `${r.data.karma ?? 0} karma` } : { verified: false };
}

async function verifyChess(u) {
  const r = await fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(u.toLowerCase())}`);
  return r.ok && r.data?.username ? { verified: true, detail: r.data.name || r.data.username } : { verified: false };
}

async function verifyScratch(u) {
  const r = await fetchJson(`https://api.scratch.mit.edu/users/${encodeURIComponent(u)}`);
  return r.ok && r.data?.username ? { verified: true, detail: `Scratch user ${r.data.username}` } : { verified: false };
}

async function verifyKeybase(u) {
  const r = await fetchJson(`https://keybase.io/_/api/1.0/user/lookup.json?username=${encodeURIComponent(u)}`);
  const user = r.data?.them?.[0] || r.data?.them;
  return r.ok && user ? { verified: true, detail: user.profile?.full_name || u } : { verified: false };
}

async function verifyReddit(u) {
  const r = await fetchJson(`https://www.reddit.com/user/${encodeURIComponent(u)}/about.json`, { headers: { accept: 'application/json' } });
  return r.ok && r.data?.data?.name ? { verified: true, detail: `${r.data.data.link_karma ?? 0} link karma` } : { verified: false };
}

function render() {
  const needle = els.filterInput.value.trim().toLowerCase();
  const visible = lastResults.filter(result => {
    const byState = activeFilter === 'all' || result.status === activeFilter;
    const byText = !needle || result.site.toLowerCase().includes(needle) || result.domain.toLowerCase().includes(needle) || result.url.toLowerCase().includes(needle);
    return byState && byText;
  });

  els.empty.classList.toggle('hidden', visible.length !== 0);
  els.grid.innerHTML = visible.map(result => `
    <a class="result-card" href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(result.site)}">
      <div class="site-icon">${escapeHtml(initials(result.site))}</div>
      <div class="result-info">
        <strong>${escapeHtml(result.site)}</strong>
        <span class="result-url">${escapeHtml(result.url.replace(/^https?:\/\//, ''))}</span>
        <span class="result-meta">${escapeHtml(result.detail || (result.kind === 'search' ? 'Site username search' : result.status === 'verified' ? 'Confirmed by public API' : 'Exact public profile pattern'))}</span>
      </div>
      <span class="status ${escapeHtml(result.status)}">${result.status === 'verified' ? 'Verified' : 'Candidate'}</span>
    </a>
  `).join('');
}

function updateCounts() {
  const verified = lastResults.filter(r => r.status === 'verified').length;
  const candidates = lastResults.filter(r => r.status === 'candidate').length;
  els.verifiedCount.textContent = String(verified);
  els.candidateCount.textContent = String(candidates);
  els.checkedCount.textContent = String(lastResults.length);
  els.summary.textContent = `${verified} verified ${verified === 1 ? 'profile' : 'profiles'} · ${candidates} public candidates`;
}

function setFilter(next) {
  activeFilter = next;
  $$('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === next));
  render();
}

function showResults(username) {
  els.hero.classList.add('hidden');
  els.resultsView.classList.remove('hidden');
  els.title.textContent = `@${username}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHome() {
  searchRun++;
  els.resultsView.classList.add('hidden');
  els.hero.classList.remove('hidden');
  els.input.focus();
}

async function runSearch(raw) {
  const username = normalizeUsername(raw);
  if (!username) return;
  const run = ++searchRun;

  els.input.value = username;
  showResults(username);
  activeFilter = 'all';
  els.filterInput.value = '';
  $$('.filter').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));

  lastResults = profileSites.map(site => ({
    site: site.site,
    domain: site.domain,
    url: site.url(username),
    kind: site.kind || 'profile',
    status: 'candidate',
    detail: site.kind === 'search' ? 'Site username search' : 'Exact public profile pattern'
  }));

  updateCounts();
  render();

  const verifiable = profileSites.map((site, index) => ({ site, index })).filter(x => typeof x.site.verify === 'function');
  els.progressWrap.classList.remove('hidden');
  els.progressBar.style.width = '8%';
  els.progressText.textContent = `Checking ${verifiable.length} browser-accessible public APIs…`;

  let finished = 0;
  await Promise.allSettled(verifiable.map(async ({ site, index }) => {
    try {
      const outcome = await site.verify(username);
      if (run !== searchRun) return;
      if (outcome?.verified) {
        lastResults[index] = { ...lastResults[index], status: 'verified', detail: outcome.detail || 'Confirmed by public API' };
      }
    } catch {
      // Cross-origin or network failure: keep the exact candidate instead of pretending it was checked.
    } finally {
      finished++;
      if (run === searchRun) {
        const pct = 8 + Math.round((finished / verifiable.length) * 92);
        els.progressBar.style.width = `${pct}%`;
        els.progressText.textContent = finished === verifiable.length
          ? `Done · ${profileSites.length} public sources prepared`
          : `Verifying public APIs ${finished}/${verifiable.length}`;
        updateCounts();
        render();
      }
    }
  }));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('plexity-theme', theme);
}

const savedTheme = localStorage.getItem('plexity-theme');
if (savedTheme === 'light' || savedTheme === 'dark') applyTheme(savedTheme);
else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) applyTheme('light');

els.themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
els.form.addEventListener('submit', event => { event.preventDefault(); runSearch(els.input.value); });
els.back.addEventListener('click', showHome);
els.filterInput.addEventListener('input', render);
$$('.filter').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
$$('[data-example]').forEach(button => button.addEventListener('click', () => {
  els.input.value = button.dataset.example;
  runSearch(button.dataset.example);
}));
