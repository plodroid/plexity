const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  form: $('#searchForm'), input: $('#searchInput'), hero: $('#hero'), results: $('#resultsView'), queryTitle: $('#queryTitle'),
  answerCard: $('#answerCard'), answerText: $('#answerText'), answerMeta: $('#answerMeta'), sourceList: $('#sourceList'), sourceCount: $('#sourceCount'),
  statusCard: $('#statusCard'), statusTitle: $('#statusTitle'), statusText: $('#statusText'), progressBar: $('#progressBar'), gpuBadge: $('#gpuBadge'),
  settingsBtn: $('#settingsBtn'), dialog: $('#settingsDialog'), modelSelect: $('#modelSelect'), searxEndpoint: $('#searxEndpoint'), defaultAi: $('#defaultAi'),
  saveSettingsBtn: $('#saveSettingsBtn'), newSearchBtn: $('#newSearchBtn')
};

const AI_MODEL = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
const defaults = { searx: '', defaultAi: true };
const STOP_WORDS = new Set(['a','an','the','is','are','was','were','what','which','who','when','where','why','how','does','do','did','make','of','to','for','in','on','at','and','or','it','this','that']);
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
    els.modelSelect.innerHTML = '<option value="wasm">Balanced local AI — SmolLM2 360M</option>';
    els.modelSelect.disabled = true;
  }
}
function detectRuntime() {
  els.gpuBadge.textContent = 'Local AI · CPU/WASM';
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

function normalizeUrl(url) { try { return new URL(url).href; } catch { return '#'; } }
function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; } }
function stripHtml(text = '') { const div = document.createElement('div'); div.innerHTML = text; return div.textContent || ''; }
function escapeHtml(s = '') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function queryTokens(query) {
  return [...new Set(query.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w)))];
}
function scoreResult(query, r) {
  const tokens = queryTokens(query);
  const title = String(r.title || '').toLowerCase();
  const snippet = String(r.snippet || '').toLowerCase();
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let score = 0;
  if (q && title.includes(q)) score += 20;
  if (q && snippet.includes(q)) score += 10;
  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (snippet.includes(token)) score += 2;
  }
  if (snippet.length > 60) score += 1;
  return score;
}
function rankResults(query, results) {
  return results.map((r, index) => ({ r, index, score: scoreResult(query, r) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(x => x.r);
}

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
  return (data.results || []).slice(0, 12).map(r => ({ title: r.title, url: r.url, snippet: stripHtml(r.content || '') }));
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
  for (const t of flatten(data.RelatedTopics || []).slice(0, 10)) {
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
    }
  };
  const jobs = [fetchDuckDuckGo(query), fetchWikipedia(query)];
  if (settings.searx) jobs.unshift(fetchSearx(query));
  const settled = await Promise.allSettled(jobs);
  for (const result of settled) if (result.status === 'fulfilled') add(result.value);
  return rankResults(query, combined).slice(0, 10);
}

async function loadGenerator(showProgress = false) {
  if (generator) return generator;
  if (generatorPromise) return generatorPromise;
  generatorPromise = (async () => {
    if (showProgress) setStatus('Preparing local AI', 'Loading the local model. The first visit takes longer; later visits use the browser cache.', 64);
    transformersModule ||= await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
    const { pipeline } = transformersModule;
    generator = await pipeline('text-generation', AI_MODEL, { device: 'wasm', dtype: 'q4' });
    return generator;
  })();
  try { return await generatorPromise; }
  finally { generatorPromise = null; }
}

function looksTimeSensitive(query) {
  return /\b(today|now|current|currently|latest|recent|recently|news|price|cost|weather|score|release|version|update|best|recommend|202[4-9])\b/i.test(query);
}
function buildPrompt(query, results) {
  const context = results.slice(0, 5).map((r, i) => `[${i + 1}] ${r.title}: ${(r.snippet || 'No snippet.').slice(0, 420)}`).join('\n');
  const grounding = looksTimeSensitive(query)
    ? 'This question may depend on current information. Base the answer on the useful sources below, cite source numbers like [1], and say when the sources are insufficient.'
    : 'For simple timeless/common-knowledge questions, answer directly from your general knowledge. Use the sources only when they actually help. Ignore irrelevant search results; never repeat unrelated titles or snippets.';
  return `You are Plexity, a helpful AI search assistant. ${grounding}\nBe direct. Start with the actual answer, not background. Keep it under 90 words unless more detail is needed.\n\nQuestion: ${query}\n\nSearch results:\n${context || 'No useful web snippets were returned.'}\n\nAnswer:`;
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
function cleanModelAnswer(text) {
  return String(text || '')
    .replace(/^answer\s*:\s*/i, '')
    .replace(/<\|.*?\|>/g, '')
    .trim();
}

async function generateAnswer(query, results, searchId) {
  els.answerCard.classList.remove('hidden');
  els.answerText.textContent = 'Thinking…';
  els.answerMeta.textContent = generator ? 'Local AI is answering…' : 'Preparing local AI…';

  const pipe = await loadGenerator(!generator);
  if (searchId !== activeSearch) return;
  setStatus('Writing answer', 'Local AI is answering your question…', 92);
  const prompt = buildPrompt(query, results);
  const output = await pipe(prompt, {
    max_new_tokens: 90,
    do_sample: false,
    repetition_penalty: 1.12
  });
  if (searchId !== activeSearch) return;

  const text = cleanModelAnswer(extractGeneratedText(output, prompt));
  if (!text || text.length < 2) throw new Error('The local model returned an empty answer.');
  els.answerText.textContent = text;
  els.answerMeta.textContent = looksTimeSensitive(query)
    ? 'Answered locally with web context · verify important/current details in the sources.'
    : 'Answered locally in your browser · no AI API used.';
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
      generateAnswer(query, results, searchId).catch(err => {
        if (searchId !== activeSearch) return;
        console.error('Local AI failed:', err);
        els.answerCard.classList.remove('hidden');
        els.answerText.textContent = 'I could not generate a reliable answer on this device. The search results are still available.';
        els.answerMeta.textContent = 'Local AI failed safely instead of showing a random web snippet.';
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
setTimeout(preloadAI, 350);
