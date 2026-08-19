const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  form: $('#searchForm'), input: $('#searchInput'), hero: $('#hero'), results: $('#resultsView'), queryTitle: $('#queryTitle'),
  answerCard: $('#answerCard'), answerText: $('#answerText'), answerMeta: $('#answerMeta'), sourceList: $('#sourceList'), sourceCount: $('#sourceCount'),
  statusCard: $('#statusCard'), statusTitle: $('#statusTitle'), statusText: $('#statusText'), progressBar: $('#progressBar'), gpuBadge: $('#gpuBadge'),
  settingsBtn: $('#settingsBtn'), dialog: $('#settingsDialog'), modelSelect: $('#modelSelect'), searxEndpoint: $('#searxEndpoint'), defaultAi: $('#defaultAi'),
  saveSettingsBtn: $('#saveSettingsBtn'), newSearchBtn: $('#newSearchBtn')
};

const defaults = { defaultAi: true };
let settings = loadSettings();
let mode = settings.defaultAi ? 'ai' : 'search';
let activeSearch = 0;

function loadSettings() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('plexity-settings') || '{}') }; }
  catch { return { ...defaults }; }
}
function saveSettings() {
  settings = { defaultAi: !!els.defaultAi.checked };
  localStorage.setItem('plexity-settings', JSON.stringify(settings));
}
function hydrateSettings() {
  els.defaultAi.checked = settings.defaultAi;
  if (els.searxEndpoint) {
    els.searxEndpoint.value = '';
    els.searxEndpoint.disabled = true;
    els.searxEndpoint.placeholder = 'Handled by Plexity Cloudflare backend';
  }
  if (els.modelSelect) {
    els.modelSelect.innerHTML = '<option value="server">Cloudflare Workers AI — Llama 3.2 3B</option>';
    els.modelSelect.disabled = true;
  }
  setMode(settings.defaultAi ? 'ai' : 'search');
}
function setRuntimeBadge() {
  els.gpuBadge.textContent = 'Plexity · Cloudflare Workers AI';
  els.gpuBadge.classList.remove('error');
  els.gpuBadge.classList.add('ok');
}
function setMode(next) {
  mode = next;
  $$('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
}
function setStatus(title, text, progress = 0) {
  els.statusCard.classList.remove('hidden');
  els.statusTitle.textContent = title;
  els.statusText.textContent = text;
  els.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}
function clearStatus() { els.statusCard.classList.add('hidden'); }
function showResults(query) {
  els.hero.classList.add('hidden');
  els.results.classList.remove('hidden');
  els.queryTitle.textContent = query;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function resetHome() {
  ++activeSearch;
  els.results.classList.add('hidden');
  els.hero.classList.remove('hidden');
  els.input.focus();
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; }
}
function renderSources(results = []) {
  els.sourceCount.textContent = results.length;
  if (!results.length) {
    els.sourceList.innerHTML = '<div class="empty">No useful sources were returned.</div>';
    return;
  }
  els.sourceList.innerHTML = results.map((r, i) => `
    <a class="source" href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener noreferrer">
      <div class="source-domain">${i + 1} · ${escapeHtml(domainOf(r.url))}</div>
      <div class="source-title">${escapeHtml(r.title || 'Untitled result')}</div>
      ${r.snippet ? `<div class="source-snippet">${escapeHtml(r.snippet)}</div>` : ''}
    </a>`).join('');
}

function directAnswer(query) {
  const q = query.toLowerCase().trim().replace(/[?!.]+$/g, '');
  const sounds = { cow:'moo', cat:'meow', dog:'bark', sheep:'baa', duck:'quack', pig:'oink', horse:'neigh', lion:'roar', wolf:'howl', owl:'hoot', bee:'buzz', snake:'hiss' };
  const m = q.match(/what sound (?:does|do) (?:a |an |the )?([a-z]+) make$/i);
  if (m && sounds[m[1]]) return `A ${m[1]} typically says “${sounds[m[1]]}.”`;
  if (/longest word(?: in history| in english)?/i.test(q)) return 'There is no single universally accepted longest word. In major English dictionaries, “pneumonoultramicroscopicsilicovolcanoconiosis” (45 letters) is commonly cited as one of the longest.';
  const g = q.match(/^how (?:do i |can i |to )?grow (?:a |an |the )?(car|computer|pc|phone|laptop|house|chair|table|tv)$/i);
  if (g) return `You can’t literally grow a ${g[1]} because it isn’t a living organism. If you meant growing a business, collection, project, or something else involving ${g[1]}s, tell me which.`;
  return null;
}

function apiEndpoint() {
  const configured = String(window.PLEXITY_API_URL || '').trim();
  return configured || 'https://plexity.housikiki.workers.dev/api/search';
}

async function callBackend(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(apiEndpoint(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, mode }),
      signal: controller.signal
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok && !(data?.aiUnavailable && Array.isArray(data?.sources))) {
      throw new Error(data?.error || `Backend HTTP ${res.status}`);
    }

    return data || {};
  } finally {
    clearTimeout(timer);
  }
}

async function fallbackWikipedia(query) {
  const r = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=8`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data.pages || []).map(p => ({
    title: p.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
    snippet: String(p.excerpt || p.description || '').replace(/<[^>]*>/g, ' ')
  }));
}

async function runSearch(query) {
  query = query.trim();
  if (!query) return;
  const searchId = ++activeSearch;
  showResults(query);
  els.answerCard.classList.add('hidden');
  els.answerText.textContent = '';
  els.answerMeta.textContent = '';
  els.sourceList.innerHTML = '';
  els.sourceCount.textContent = '0';

  const instant = mode === 'ai' ? directAnswer(query) : null;
  if (instant) {
    els.answerCard.classList.remove('hidden');
    els.answerText.textContent = instant;
    els.answerMeta.textContent = 'Instant answer · checking web sources…';
  }

  setStatus('Searching', mode === 'ai' ? 'Plexity is searching and preparing an AI answer…' : 'Plexity is searching the web…', 25);
  try {
    const data = await callBackend(query);
    if (searchId !== activeSearch) return;
    renderSources(data.sources || []);

    if (mode === 'ai') {
      els.answerCard.classList.remove('hidden');
      if (data.answer) {
        els.answerText.textContent = data.answer;
        els.answerMeta.textContent = 'Answered by Cloudflare Workers AI with live web context.';
      } else if (instant) {
        els.answerText.textContent = instant;
        els.answerMeta.textContent = data.aiLimited
          ? 'Cloudflare free AI quota reached · instant answer shown instead.'
          : 'Instant answer.';
      } else if (data.aiLimited) {
        els.answerText.textContent = 'The free Cloudflare AI quota is currently exhausted, but your search results are ready.';
        els.answerMeta.textContent = 'Plexity hard-stops at the free limit instead of using paid AI.';
      } else {
        els.answerText.textContent = 'Cloudflare Workers AI is temporarily unavailable, but your search results are ready.';
        els.answerMeta.textContent = 'Search fallback is still active.';
      }
    }
  } catch (err) {
    console.warn('Plexity Cloudflare backend unavailable:', err);
    const sources = await fallbackWikipedia(query).catch(() => []);
    if (searchId !== activeSearch) return;
    renderSources(sources);
    if (mode === 'ai' && !instant) {
      els.answerCard.classList.remove('hidden');
      els.answerText.textContent = 'The Cloudflare backend is temporarily unreachable. Wikipedia fallback still works.';
      els.answerMeta.textContent = 'Plexity will automatically use the Cloudflare Worker again when it is reachable.';
    } else if (instant) {
      els.answerMeta.textContent = 'Instant answer · Cloudflare backend is temporarily unreachable.';
    }
  } finally {
    if (searchId === activeSearch) clearStatus();
  }
}

els.form.addEventListener('submit', e => { e.preventDefault(); runSearch(els.input.value); });
$$('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-query]').forEach(b => b.addEventListener('click', () => { els.input.value = b.dataset.query; runSearch(b.dataset.query); }));
els.newSearchBtn.addEventListener('click', resetHome);
els.settingsBtn.addEventListener('click', () => els.dialog.showModal());
els.saveSettingsBtn.addEventListener('click', () => { saveSettings(); setMode(settings.defaultAi ? 'ai' : 'search'); });

hydrateSettings();
setRuntimeBadge();
