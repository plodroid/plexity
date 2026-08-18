const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  form: $('#searchForm'), input: $('#searchInput'), hero: $('#hero'), results: $('#resultsView'), queryTitle: $('#queryTitle'),
  answerCard: $('#answerCard'), answerText: $('#answerText'), answerMeta: $('#answerMeta'), sourceList: $('#sourceList'), sourceCount: $('#sourceCount'),
  statusCard: $('#statusCard'), statusTitle: $('#statusTitle'), statusText: $('#statusText'), progressBar: $('#progressBar'), gpuBadge: $('#gpuBadge'),
  settingsBtn: $('#settingsBtn'), dialog: $('#settingsDialog'), modelSelect: $('#modelSelect'), searxEndpoint: $('#searxEndpoint'), defaultAi: $('#defaultAi'),
  saveSettingsBtn: $('#saveSettingsBtn'), newSearchBtn: $('#newSearchBtn')
};

const AI_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
const defaults = { searx: '', defaultAi: true };
const STOP_WORDS = new Set(['a','an','the','is','are','was','were','what','which','who','when','where','why','how','does','do','did','make','of','to','for','in','on','at','and','or','it','this','that']);
const ANIMAL_SOUNDS = {
  cow:'moo', cattle:'moo', cat:'meow', kitten:'meow', dog:'bark', puppy:'bark', sheep:'baa', lamb:'baa',
  duck:'quack', pig:'oink', horse:'neigh', lion:'roar', tiger:'roar', wolf:'howl', frog:'croak', rooster:'crow',
  chicken:'cluck', hen:'cluck', owl:'hoot', bee:'buzz', snake:'hiss', elephant:'trumpet', goat:'bleat', donkey:'bray', turkey:'gobble'
};

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
    els.modelSelect.innerHTML = '<option value="wasm">Qwen2.5 0.5B — smarter local AI</option>';
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
    .map(x => ({ ...x.r, _score: x.score }));
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

function directAnswer(query) {
  const q = query.toLowerCase().trim().replace(/[?!.]+$/g, '');
  let match = q.match(/(?:what sound (?:does|do)\s+(?:a |an |the )?|what does (?:a |an |the )?)([a-z]+)(?:\s+make|\s+say)?$/i);
  if (match) {
    const animal = match[1].toLowerCase();
    const sound = ANIMAL_SOUNDS[animal];
    if (sound) return `A ${animal} typically says “${sound}.”`;
  }
  if (/^(?:what(?:'s| is) )?the longest word(?: in (?:english|history))?$/i.test(q) || /longest word in history/i.test(q)) {
    return 'There is no single universally accepted “longest word.” In English dictionaries, **pneumonoultramicroscopicsilicovolcanoconiosis** (45 letters) is commonly cited as one of the longest. Systematic chemical names can be vastly longer, so the answer depends on what counts as a word.';
  }
  return null;
}

async function loadGenerator(showProgress = false) {
  if (generator) return generator;
  if (generatorPromise) return generatorPromise;
  generatorPromise = (async () => {
    if (showProgress) setStatus('Preparing local AI', 'First load downloads the local Qwen model. It is cached for later searches.', 64);
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
function usefulSources(results) {
  return results.filter(r => (r._score || 0) >= 5 && r.snippet).slice(0, 5);
}
function buildMessages(query, results) {
  const current = looksTimeSensitive(query);
  const sources = usefulSources(results);
  const sourceText = sources.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet.slice(0, 450)}`).join('\n');

  const system = current
    ? 'You are Plexity, an accurate AI search assistant. The question may depend on current information. Use only useful supplied web snippets for current claims. Cite them as [1], [2], etc. If they do not support an answer, say that clearly. Ignore irrelevant sources. Answer directly and concisely.'
    : 'You are Plexity, a helpful and accurate assistant. For timeless/common-knowledge questions, answer from your own knowledge. Do not let irrelevant search snippets distract you. If useful snippets are provided, you may use them, but do not copy unrelated text. Answer the exact question first. Keep the answer concise.';

  const user = current
    ? `Question: ${query}\n\nWeb snippets:\n${sourceText || 'No sufficiently relevant web snippets were found.'}`
    : `Question: ${query}${sourceText ? `\n\nPotentially useful web snippets (ignore any that are irrelevant):\n${sourceText}` : ''}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}
function extractChatAnswer(output) {
  const value = output?.[0]?.generated_text;
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      if (value[i]?.role === 'assistant' && value[i]?.content) return String(value[i].content).trim();
    }
    return String(value[value.length - 1]?.content || '').trim();
  }
  return String(value || '').trim();
}
function cleanModelAnswer(text) {
  let out = String(text || '')
    .replace(/<\|.*?\|>/g, '')
    .replace(/^assistant\s*[:\n]\s*/i, '')
    .replace(/^answer\s*:\s*/i, '')
    .trim();
  const repeated = out.match(/^(.{12,120}?)(?:\n\s*\1){2,}/s);
  if (repeated) out = repeated[1].trim();
  return out;
}

async function generateAnswer(query, results, searchId) {
  const instant = directAnswer(query);
  if (instant) {
    els.answerCard.classList.remove('hidden');
    els.answerText.textContent = instant;
    els.answerMeta.textContent = 'Instant answer · local AI not needed for this simple question.';
    return;
  }

  els.answerCard.classList.remove('hidden');
  els.answerText.textContent = 'Thinking…';
  els.answerMeta.textContent = generator ? 'Local AI is answering…' : 'Preparing local AI…';

  const pipe = await loadGenerator(!generator);
  if (searchId !== activeSearch) return;
  setStatus('Writing answer', 'Local AI is answering your question…', 92);

  const messages = buildMessages(query, results);
  const output = await pipe(messages, {
    max_new_tokens: looksTimeSensitive(query) ? 140 : 110,
    do_sample: false,
    repetition_penalty: 1.15
  });
  if (searchId !== activeSearch) return;

  const text = cleanModelAnswer(extractChatAnswer(output));
  if (!text || text.length < 2) throw new Error('The local model returned an empty answer.');
  els.answerText.textContent = text;
  els.answerMeta.textContent = looksTimeSensitive(query)
    ? 'Answered locally with relevant web context · check sources for current details.'
    : 'Answered locally with Qwen2.5 0.5B · no AI API used.';
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

  const instant = mode === 'ai' ? directAnswer(query) : null;
  if (instant) {
    els.answerCard.classList.remove('hidden');
    els.answerText.textContent = instant;
    els.answerMeta.textContent = 'Instant answer · fetching sources in the background.';
  }
  setStatus('Searching', 'Fetching sources…', 18);

  try {
    const results = await searchWeb(query);
    if (searchId !== activeSearch) return;
    renderSources(results);
    clearStatus();

    if (mode === 'ai') {
      if (instant) {
        els.answerMeta.textContent = 'Instant answer · simple question answered without waiting for the local model.';
      } else {
        generateAnswer(query, results, searchId).catch(err => {
          if (searchId !== activeSearch) return;
          console.error('Local AI failed:', err);
          els.answerCard.classList.remove('hidden');
          els.answerText.textContent = 'I could not generate a reliable answer on this device. The search results are still available.';
          els.answerMeta.textContent = 'Local AI failed safely instead of showing nonsense.';
          clearStatus();
        }).finally(() => { if (searchId === activeSearch) clearStatus(); });
      }
    }
  } catch (err) {
    if (searchId !== activeSearch) return;
    renderSources([]);
    if (!instant) {
      els.answerCard.classList.remove('hidden');
      els.answerText.innerHTML = `<span class="error">Search failed:</span> ${escapeHtml(err.message)}`;
    }
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
setTimeout(preloadAI, 700);
