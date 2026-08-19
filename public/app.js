const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  hero: $('#hero'), results: $('#resultsView'), form: $('#searchForm'), input: $('#usernameInput'),
  back: $('#backBtn'), title: $('#resultTitle'), summary: $('#summary'), found: $('#foundCount'),
  unknown: $('#unknownCount'), checked: $('#checkedCount'), progress: $('#progressBar'), progressText: $('#progressText'),
  grid: $('#resultGrid'), empty: $('#emptyState'), filterInput: $('#filterInput'), theme: $('#themeToggle')
};

let results = [];
let activeFilter = 'found';
let progressTimer = null;

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/').pop().slice(0, 64);
}

function escapeHtml(v = '') {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function initials(name) {
  return String(name || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
}

function startProgress() {
  clearInterval(progressTimer);
  let value = 7;
  els.progress.style.width = `${value}%`;
  progressTimer = setInterval(() => {
    value += Math.max(0.5, (88 - value) * 0.045);
    if (value >= 88) value = 88;
    els.progress.style.width = `${value}%`;
  }, 260);
}

function finishProgress(ok = true) {
  clearInterval(progressTimer);
  els.progress.style.width = '100%';
  els.progressText.textContent = ok ? 'Scan complete' : 'Scan failed';
}

function setFilter(next) {
  activeFilter = next;
  $$('.filter').forEach(b => b.classList.toggle('active', b.dataset.filter === next));
  render();
}

function render() {
  const needle = els.filterInput.value.trim().toLowerCase();
  const visible = results.filter(r => {
    const byState = activeFilter === 'all' || r.status === activeFilter;
    const byText = !needle || r.site.toLowerCase().includes(needle) || r.url.toLowerCase().includes(needle);
    return byState && byText;
  });

  els.empty.classList.toggle('hidden', visible.length > 0);
  els.grid.innerHTML = visible.map(r => `
    <a class="result-card" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">
      <div class="site-icon">${escapeHtml(initials(r.site))}</div>
      <div class="result-info">
        <strong>${escapeHtml(r.site)}</strong>
        <span class="result-url">${escapeHtml(hostOf(r.url))}${r.statusCode ? ` · HTTP ${escapeHtml(r.statusCode)}` : ''}</span>
      </div>
      <span class="status ${escapeHtml(r.status)}">${r.status === 'found' ? 'Found' : r.status === 'unknown' ? 'Unclear' : 'Not found'}</span>
      <svg class="result-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
    </a>
  `).join('');
}

function showResults(username) {
  els.hero.classList.add('hidden');
  els.results.classList.remove('hidden');
  els.title.textContent = `@${username}`;
  window.scrollTo({top:0,behavior:'smooth'});
}

function showHome() {
  els.results.classList.add('hidden');
  els.hero.classList.remove('hidden');
  els.input.focus();
}

async function runSearch(raw) {
  const username = normalizeUsername(raw);
  if (!username) return;

  els.input.value = username;
  results = [];
  showResults(username);
  setFilter('found');
  els.filterInput.value = '';
  els.found.textContent = '0';
  els.unknown.textContent = '0';
  els.checked.textContent = '0';
  els.summary.textContent = 'Checking Sherlock site definitions…';
  els.progressText.textContent = 'Scanning public profile URLs…';
  startProgress();

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({username})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

    results = Array.isArray(data.results) ? data.results : [];
    const found = results.filter(r => r.status === 'found').length;
    const unknown = results.filter(r => r.status === 'unknown').length;
    const checked = Number(data.checked || results.length);

    els.found.textContent = String(found);
    els.unknown.textContent = String(unknown);
    els.checked.textContent = String(checked);
    els.summary.textContent = found
      ? `${found} public ${found === 1 ? 'profile' : 'profiles'} found across ${checked} checked sites.`
      : `No confirmed profiles found across ${checked} checked sites.`;
    finishProgress(true);
    render();
  } catch (error) {
    console.error(error);
    finishProgress(false);
    els.summary.textContent = 'The Netlify scanner did not respond.';
    els.empty.classList.remove('hidden');
    els.empty.querySelector('h3').textContent = 'Scanner unavailable';
    els.empty.querySelector('p').textContent = 'Make sure this site is deployed on Netlify so /api/search can run.';
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('plexity-theme', theme);
}

els.theme.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
els.form.addEventListener('submit', e => { e.preventDefault(); runSearch(els.input.value); });
els.back.addEventListener('click', showHome);
els.filterInput.addEventListener('input', render);
$$('.filter').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
$$('[data-example]').forEach(b => b.addEventListener('click', () => { els.input.value = b.dataset.example; runSearch(b.dataset.example); }));

applyTheme(localStorage.getItem('plexity-theme') || 'dark');
