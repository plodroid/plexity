const API_URL = 'https://plexity.housikiki.workers.dev/api/search';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  hero: $('#hero'),
  resultsView: $('#resultsView'),
  form: $('#searchForm'),
  input: $('#usernameInput'),
  back: $('#backBtn'),
  title: $('#resultTitle'),
  summary: $('#summary'),
  foundCount: $('#foundCount'),
  checkedCount: $('#checkedCount'),
  progressWrap: $('#progressWrap'),
  progressBar: $('#progressBar'),
  progressText: $('#progressText'),
  grid: $('#resultGrid'),
  empty: $('#emptyState'),
  filterInput: $('#filterInput')
};

let lastResults = [];
let activeFilter = 'all';

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .split('/').pop()
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 64);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function initials(name) {
  return String(name || '?').slice(0, 2).toUpperCase();
}

function render() {
  const needle = els.filterInput.value.trim().toLowerCase();
  const visible = lastResults.filter((result) => {
    const byState = activeFilter === 'all' || result.status === activeFilter;
    const byText = !needle || result.site.toLowerCase().includes(needle) || result.url.toLowerCase().includes(needle);
    return byState && byText;
  });

  els.empty.classList.toggle('hidden', visible.length !== 0);
  els.grid.innerHTML = visible.map((result) => `
    <a class="result-card" href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">
      <div class="site-icon">${escapeHtml(initials(result.site))}</div>
      <div class="result-info">
        <strong>${escapeHtml(result.site)}</strong>
        <span class="result-url">${escapeHtml(result.url.replace(/^https?:\/\//, ''))}</span>
      </div>
      <span class="status ${escapeHtml(result.status)}">${result.status === 'found' ? 'Found' : result.status === 'possible' ? 'Possible' : 'Not found'}</span>
    </a>
  `).join('');
}

function setFilter(next) {
  activeFilter = next;
  $$('.filter').forEach((button) => button.classList.toggle('active', button.dataset.filter === next));
  render();
}

function showResults(username) {
  els.hero.classList.add('hidden');
  els.resultsView.classList.remove('hidden');
  els.title.textContent = `@${username}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHome() {
  els.resultsView.classList.add('hidden');
  els.hero.classList.remove('hidden');
  els.input.focus();
}

async function runSearch(raw) {
  const username = normalizeUsername(raw);
  if (!username) return;

  els.input.value = username;
  showResults(username);
  lastResults = [];
  activeFilter = 'all';
  els.filterInput.value = '';
  setFilter('all');
  els.foundCount.textContent = '0';
  els.checkedCount.textContent = '0';
  els.summary.textContent = 'Scanning public profile pages…';
  els.progressWrap.classList.remove('hidden');
  els.progressBar.style.width = '12%';
  els.progressText.textContent = 'Contacting Plexity scanner…';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

    lastResults = Array.isArray(data.results) ? data.results : [];
    const found = lastResults.filter((r) => r.status === 'found').length;
    const possible = lastResults.filter((r) => r.status === 'possible').length;

    els.foundCount.textContent = String(found);
    els.checkedCount.textContent = String(lastResults.length);
    els.summary.textContent = `${found} confirmed-looking ${found === 1 ? 'profile' : 'profiles'}${possible ? ` · ${possible} possible` : ''}`;
    els.progressBar.style.width = '100%';
    els.progressText.textContent = `Checked ${lastResults.length} public profile patterns`;
    render();
  } catch (error) {
    console.error(error);
    els.summary.textContent = 'The scanner backend is unavailable right now.';
    els.progressBar.style.width = '100%';
    els.progressText.textContent = 'Scan failed';
    els.empty.textContent = 'Could not reach the Plexity scanner. Try again shortly.';
    els.empty.classList.remove('hidden');
  }
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  runSearch(els.input.value);
});
els.back.addEventListener('click', showHome);
els.filterInput.addEventListener('input', render);
$$('.filter').forEach((button) => button.addEventListener('click', () => setFilter(button.dataset.filter)));
$$('[data-example]').forEach((button) => button.addEventListener('click', () => {
  els.input.value = button.dataset.example;
  runSearch(button.dataset.example);
}));
