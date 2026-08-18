const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  form: $('#searchForm'), input: $('#searchInput'), hero: $('#hero'), results: $('#resultsView'), queryTitle: $('#queryTitle'),
  answerCard: $('#answerCard'), answerText: $('#answerText'), answerMeta: $('#answerMeta'), sourceList: $('#sourceList'), sourceCount: $('#sourceCount'),
  statusCard: $('#statusCard'), statusTitle: $('#statusTitle'), statusText: $('#statusText'), progressBar: $('#progressBar'), gpuBadge: $('#gpuBadge'),
  settingsBtn: $('#settingsBtn'), dialog: $('#settingsDialog'), modelSelect: $('#modelSelect'), searxEndpoint: $('#searxEndpoint'), defaultAi: $('#defaultAi'),
  saveSettingsBtn: $('#saveSettingsBtn'), newSearchBtn: $('#newSearchBtn')
};

const AI_MODEL = 'onnx-community/SmolLM-135M-Instruct-ONNX';
const defaults = { searx: '', defaultAi: true };
let settings = loadSettings();
let mode = settings.defaultAi ? 'ai' : 'search';
let generator = null;
let generatorPromise = null;
let transformersModule = null;
let preloadStarted = false;
let activeSearch = 0;

function loadSettings() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('plexity-settings') || '{}') }; }
  catch { return { ...defaults }; }
}
function saveSettings() {
  settings = { searx: els.searxEndpoint.value.trim(), defaultAi: els.defaultAi.checked };
  localStorage.setItem('plexity-settings', JSON.stringify(settings));
}
function hydrateSettings() {
  els.searxEndpoint.value = settings.searx || '';
  els.defaultAi.checked = settings.defaultAi;
  setMode(settings.defaultAi ? 'ai' : 'search');
  if (els.modelSelect) {
    els.modelSelect.innerHTML = '<option value="wasm">Fast & compatible — SmolLM 135M (~181 MB)</option>';
    els.modelSelect.disabled = true;
  }
}

function detectRuntime() {
  els.gpuBadge.textContent = 'Local AI · compatible mode';
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
  els.results.classList.add('hidden');
  els.hero.classList.remove('hidden');
  els.input.focus();
}

function normalizeUrl(url) { try { return new URL(url).href; } catch { return '#'; } }
function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; } }
function stripHtml(text = '') { const div = document.createElement('div'); div.innerHTML = text; return div.textContent || ''; }
function escapeHtml(s = '') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function renderSources(results) {
  els.sourceCount.textContent = results.length;
  if (!results.length) {
    els.sourceList.innerHTML = '<div class="empty">No browser-safe web source returned results. Add a SearXNG endpoint in Settings for broader web search.</div>';
    return;
  }
  els.sourceList.innerHTML = results.map((r, i) => `
    <a class="source" href="${escapeHtml(normalizeUrl(r.url))}" target="_blank" rel="noopener noreferrer">
      <div class="source-domain">${i + 1} · ${escapeHtml(domainOf(r.url))}</div>
      <div class="source-title">${escapeHtml(r.title || 'Untitled result')}</div>
      ${r.snippet ? `<div class="source-snippet">${escapeHtml(r.snippet)}</div>` : ''}
    </a>`).join('');
}

async function fetchSearx(query) {
  if (!settings.searx) return [];
  const url = new URL(settings.searx.replace(/\/$/, ''));
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`SearXNG HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: stripHtml(r.content || '') }));
}
async function fetchWikipedia(query) {
  const res = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=8`);
  if (!res.ok) throw new Error('Wikipedia search failed');
  const data = await res.json();
  return (data.pages || []).map(p => ({
    title: p.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
    snippet: stripHtml(p.excerpt || p.description || '')
  }));
}
async function fetchDuckDuckGo(query) {
  const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=1`);
  if (!res.ok) throw new Error('DuckDuckGo API failed');
  const data = await res.json();
  const out = [];
  if (data.AbstractURL && data.AbstractText) out.push({ title: data.Heading || query, url: data.AbstractURL, snippet: data.AbstractText });
  const flatten = topics => topics.flatMap(t => t.Topics ? flatten(t.Topics) : [t]);
  for (const t of flatten(data.RelatedTopics || []).slice(0, 7)) {
    if (t.FirstURL && t.Text) out.push({ title: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text });
  }
  return out;
}
async function searchWeb(query) {
  const seen = new Set(), combined = [];
  const add = items => {
    for (const r of items) {
      if (!r?.url || seen.has(r.url)) continue;
      seen.add(r.url); combined.push(r);
      if (combined.length >= 10) break;
    }
  };

  const jobs = [fetchDuckDuckGo(query), fetchWikipedia(query)];
  if (settings.searx) jobs.unshift(fetchSearx(query));
  const settled = await Promise.allSettled(jobs);
  for (const result of settled) if (result.status === 'fulfilled') add(result.value);
  return combined.slice(0, 10);
}

function quickAnswer(results) {
  const useful = results.find(r => r.snippet && r.snippet.length > 35);
  if (!useful) return 'I found the web results, but there is not enough useful text in the snippets to give a quick answer yet.';
  return `${useful.snippet} [${results.indexOf(useful) + 1}]`;
}

async function loadGenerator(showProgress = false) {
  if (generator) return generator;
  if (generatorPromise) return generatorPromise;

  generatorPromise = (async () => {
    if (showProgress) setStatus('Preparing local AI', 'First use downloads a small ~181 MB model. It is cached for later searches.', 65);
    transformersModule ||= await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
    const { pipeline } = transformersModule;
    const pipe = await pipeline('text-generation', AI_MODEL, {
      device: 'wasm',
      dtype: 'q4'
    });
    generator = pipe;
    return pipe;
  })();

  try { return await generatorPromise; }
  finally { generatorPromise = null; }
}

function buildPrompt(query, results) {
  const context = results.slice(0, 6).map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet || 'No snippet.'}`).join('\n');
  return `You are Plexity, a concise web search assistant. Answer the question using ONLY the search snippets below. Cite claims with [1], [2], etc. If the snippets do not support an answer, say so. Keep the answer under 120 words.\n\nQuestion: ${query}\n\nSources:\n${context}\n\nAnswer:`;
}

function extractGeneratedText(output, prompt) {
  const value = output?.[0]?.generated_text;
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return String(last?.content || '').trim();
  }
  const text = String(value || '').trim();
  if (text.startsWith(prompt)) return text.slice(prompt.length).trim();
  return text;
}

async function generateAnswer(query, results, searchId) {
  els.answerCard.classList.remove('hidden');
  els.answerText.textContent = quickAnswer(results);
  els.answerMeta.textContent = 'Quick answer from web snippets · local AI is refining this…';

  const pipe = await loadGenerator(true);
  if (searchId !== activeSearch) return;
  setStatus('Refining answer', 'Local AI is summarizing the sources…', 92);

  const prompt = buildPrompt(query, results);
  const output = await pipe(prompt, {
    max_new_tokens: 110,
    do_sample: false,
    repetition_penalty: 1.08
  });
  if (searchId !== activeSearch) return;

  const text = extractGeneratedText(output, prompt);
  if (text) els.answerText.textContent = text;
  els.answerMeta.textContent = 'Generated locally with SmolLM 135M on CPU/WASM. No AI API key used.';
}

async function runSearch(query) {
  query = query.trim(); if (!query) return;
  const searchId = ++activeSearch;
  showResults(query);
  els.answerCard.classList.add('hidden');
  els.answerText.textContent = '';
  els.answerMeta.textContent = '';
  els.sourceList.innerHTML = '';
  els.sourceCount.textContent = '0';
  setStatus('Searching', 'Fetching sources…', 18);

  try {
    const results = await searchWeb(query);
    if (searchId !== activeSearch) return;
    renderSources(results);
    clearStatus();

    if (mode === 'ai') {
      els.answerCard.classList.remove('hidden');
      els.answerText.textContent = quickAnswer(results);
      els.answerMeta.textContent = 'Quick answer shown instantly · preparing local AI refinement…';
      generateAnswer(query, results, searchId).catch(err => {
        if (searchId !== activeSearch) return;
        console.error('Local AI refinement failed:', err);
        els.answerMeta.textContent = 'Quick answer from web snippets · local AI refinement was unavailable.';
        clearStatus();
      }).finally(() => { if (searchId === activeSearch) clearStatus(); });
    }
  } catch (err) {
    if (searchId !== activeSearch) return;
    renderSources([]);
    els.answerCard.classList.remove('hidden');
    els.answerText.innerHTML = `<span class="error">Search failed:</span> ${escapeHtml(err.message)}`;
    clearStatus();
  }
}

function preloadAI() {
  if (preloadStarted) return;
  preloadStarted = true;
  loadGenerator(false).catch(err => console.warn('AI preload skipped/failed:', err));
}

els.form.addEventListener('submit', e => { e.preventDefault(); runSearch(els.input.value); });
$$('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-query]').forEach(b => b.addEventListener('click', () => { els.input.value = b.dataset.query; runSearch(b.dataset.query); }));
els.newSearchBtn.addEventListener('click', resetHome);
els.settingsBtn.addEventListener('click', () => els.dialog.showModal());
els.saveSettingsBtn.addEventListener('click', () => { saveSettings(); setMode(settings.defaultAi ? 'ai' : 'search'); });

hydrateSettings();
detectRuntime();
if ('requestIdleCallback' in window) requestIdleCallback(preloadAI, { timeout: 2500 });
else setTimeout(preloadAI, 1200);
