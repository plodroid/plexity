const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  form: $('#searchForm'), input: $('#searchInput'), hero: $('#hero'), results: $('#resultsView'), queryTitle: $('#queryTitle'),
  answerCard: $('#answerCard'), answerText: $('#answerText'), answerMeta: $('#answerMeta'), sourceList: $('#sourceList'), sourceCount: $('#sourceCount'),
  statusCard: $('#statusCard'), statusTitle: $('#statusTitle'), statusText: $('#statusText'), progressBar: $('#progressBar'), gpuBadge: $('#gpuBadge'),
  settingsBtn: $('#settingsBtn'), dialog: $('#settingsDialog'), modelSelect: $('#modelSelect'), searxEndpoint: $('#searxEndpoint'), defaultAi: $('#defaultAi'),
  saveSettingsBtn: $('#saveSettingsBtn'), newSearchBtn: $('#newSearchBtn')
};

const defaults = { searx: '', defaultAi: true };
const STOP_WORDS = new Set(['a','an','the','is','are','was','were','what','which','who','when','where','why','how','does','do','did','make','of','to','for','in','on','at','and','or','it','this','that']);
const ANIMAL_SOUNDS = {
  cow:'moo', cattle:'moo', cat:'meow', kitten:'meow', dog:'bark', puppy:'bark', sheep:'baa', lamb:'baa', duck:'quack', pig:'oink',
  horse:'neigh', lion:'roar', tiger:'roar', wolf:'howl', frog:'croak', rooster:'crow', chicken:'cluck', hen:'cluck', owl:'hoot',
  bee:'buzz', snake:'hiss', elephant:'trumpet', goat:'bleat', donkey:'bray', turkey:'gobble'
};
const INANIMATE_GROW = new Set(['car','cars','computer','pc','phone','laptop','house','building','chair','table','tv','television','console','keyboard','mouse','monitor','bike','bicycle','motorcycle','truck','bus','plane','airplane','boat','ship']);

let settings = loadSettings();
let mode = settings.defaultAi ? 'ai' : 'search';
let activeSearch = 0;
let aiWorker = null;
let aiRequest = null;
let aiSequence = 0;

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
    els.modelSelect.innerHTML = '<option value="worker">Qwen2.5 0.5B — isolated worker</option>';
    els.modelSelect.disabled = true;
  }
}
function detectRuntime() {
  els.gpuBadge.textContent = 'Local AI · isolated CPU mode';
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
  cancelAI();
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
  const soundMatch = q.match(/(?:what sound (?:does|do)\s+(?:a |an |the )?|what does (?:a |an |the )?)([a-z]+)(?:\s+make|\s+say)?$/i);
  if (soundMatch) {
    const animal = soundMatch[1].toLowerCase();
    const sound = ANIMAL_SOUNDS[animal];
    if (sound) return `A ${animal} typically says “${sound}.”`;
  }

  const growMatch = q.match(/^how (?:do i |can i |to )?grow (?:a |an |the )?([a-z]+)$/i);
  if (growMatch && INANIMATE_GROW.has(growMatch[1])) {
    const thing = growMatch[1];
    return `You can’t literally grow a ${thing} because it isn’t a living organism. Cars are manufactured from parts and materials. If you meant growing a car-related business, collection, or project, say which one and I can help.`;
  }

  if (/^(?:what(?:'s| is) )?the longest word(?: in (?:english|history))?$/i.test(q) || /longest word in history/i.test(q)) {
    return 'There is no single universally accepted “longest word.” In English dictionaries, pneumonoultramicroscopicsilicovolcanoconiosis (45 letters) is commonly cited as one of the longest. Chemical names can be vastly longer, so the answer depends on what counts as a word.';
  }
  return null;
}

function looksTimeSensitive(query) {
  return /\b(today|now|current|currently|latest|recent|recently|news|price|cost|weather|score|release|version|update|best|recommend|202[4-9])\b/i.test(query);
}
function usefulSources(results) {
  return results.filter(r => (r._score || 0) >= 5 && r.snippet).slice(0, 3);
}
function buildMessages(query, results) {
  const current = looksTimeSensitive(query);
  const sources = usefulSources(results);
  const sourceText = sources.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet.slice(0, 220)}`).join('\n');
  const system = current
    ? 'You are Plexity, a concise AI search assistant. For current claims, use only the relevant supplied snippets and cite [1], [2], etc. Ignore irrelevant snippets. If evidence is insufficient, say so. Answer the exact question first in under 70 words.'
    : 'You are Plexity, a concise helpful assistant. Answer the exact question directly from common knowledge. Use snippets only if useful and ignore irrelevant ones. Do not invent steps for impossible premises. If something cannot literally be done, say so plainly. Keep the answer under 70 words.';
  const user = current
    ? `Question: ${query}\n\nRelevant web snippets:\n${sourceText || 'No sufficiently relevant snippets.'}`
    : `Question: ${query}${sourceText ? `\n\nOptional snippets:\n${sourceText}` : ''}`;
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

function cleanModelAnswer(text) {
  return String(text || '')
    .replace(/<\|.*?\|>/g, '')
    .replace(/^assistant\s*[:\n]\s*/i, '')
    .replace(/^answer\s*:\s*/i, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
}

function createAIWorker() {
  if (aiWorker) return aiWorker;
  aiWorker = new Worker('./ai-worker.js', { type: 'module' });
  aiWorker.onerror = (event) => {
    console.error('AI worker crashed:', event.message || event);
    if (aiRequest) {
      aiRequest.reject(new Error('The local AI worker crashed.'));
      aiRequest = null;
    }
    aiWorker.terminate();
    aiWorker = null;
  };
  aiWorker.onmessage = (event) => {
    const data = event.data || {};
    if (!aiRequest || data.id !== aiRequest.id) return;
    if (data.type === 'status') {
      if (data.status === 'loading') {
        setStatus('Loading local AI', 'One-time model load. The page stays usable while this happens.', 64);
        els.answerMeta.textContent = 'Loading the local model in a background worker…';
      } else if (data.status === 'generating') {
        aiRequest.startedGenerating = true;
        clearTimeout(aiRequest.timer);
        aiRequest.timer = setTimeout(() => timeoutAI(aiRequest.id), 12000);
        setStatus('Writing answer', 'Local AI is thinking in a background worker…', 92);
        els.answerMeta.textContent = 'Local AI is answering…';
      }
      return;
    }
    if (data.type === 'result') {
      clearTimeout(aiRequest.timer);
      const resolve = aiRequest.resolve;
      aiRequest = null;
      resolve(cleanModelAnswer(data.text));
    } else if (data.type === 'error') {
      clearTimeout(aiRequest.timer);
      const reject = aiRequest.reject;
      aiRequest = null;
      reject(new Error(data.error || 'Local AI failed.'));
    }
  };
  return aiWorker;
}

function timeoutAI(id) {
  if (!aiRequest || aiRequest.id !== id) return;
  const reject = aiRequest.reject;
  aiRequest = null;
  if (aiWorker) aiWorker.terminate();
  aiWorker = null;
  reject(new Error('Local AI took too long and was stopped.'));
}

function cancelAI() {
  if (aiRequest) {
    clearTimeout(aiRequest.timer);
    aiRequest.reject(new Error('cancelled'));
    aiRequest = null;
  }
  if (aiWorker) {
    aiWorker.terminate();
    aiWorker = null;
  }
}

function askLocalAI(messages, maxNewTokens) {
  if (aiRequest) cancelAI();
  const worker = createAIWorker();
  const id = ++aiSequence;
  return new Promise((resolve, reject) => {
    aiRequest = {
      id, resolve, reject, startedGenerating: false,
      timer: setTimeout(() => timeoutAI(id), 60000)
    };
    worker.postMessage({ id, messages, maxNewTokens });
  });
}

async function generateAnswer(query, results, searchId) {
  const instant = directAnswer(query);
  if (instant) {
    els.answerCard.classList.remove('hidden');
    els.answerText.textContent = instant;
    els.answerMeta.textContent = 'Instant answer · local model not needed.';
    return;
  }

  els.answerCard.classList.remove('hidden');
  els.answerText.textContent = 'Thinking…';
  els.answerMeta.textContent = 'Starting isolated local AI…';
  const maxTokens = looksTimeSensitive(query) ? 64 : 52;

  try {
    const text = await askLocalAI(buildMessages(query, results), maxTokens);
    if (searchId !== activeSearch) return;
    if (!text || text.length < 2) throw new Error('The local model returned an empty answer.');
    els.answerText.textContent = text;
    els.answerMeta.textContent = looksTimeSensitive(query)
      ? 'Answered locally with relevant web context · check sources for current details.'
      : 'Answered locally with Qwen2.5 0.5B in an isolated worker.';
  } catch (err) {
    if (searchId !== activeSearch || err.message === 'cancelled') return;
    const best = usefulSources(results)[0];
    if (best && best._score >= 10) {
      els.answerText.textContent = `${best.snippet.slice(0, 320)}${best.snippet.length > 320 ? '…' : ''}`;
      els.answerMeta.textContent = `Local AI was stopped safely · showing the strongest matching web snippet instead.`;
    } else {
      els.answerText.textContent = err.message.includes('too long')
        ? 'The local AI was taking too long, so Plexity stopped it instead of freezing the page. The web results are still available.'
        : 'The local AI could not finish safely on this device. The web results are still available.';
      els.answerMeta.textContent = 'The AI worker was isolated so the page can keep running.';
    }
  } finally {
    if (searchId === activeSearch) clearStatus();
  }
}

async function runSearch(query) {
  query = query.trim();
  if (!query) return;

  const searchId = ++activeSearch;
  cancelAI();
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
        els.answerMeta.textContent = 'Instant answer · no heavy model needed.';
      } else {
        generateAnswer(query, results, searchId);
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

els.form.addEventListener('submit', e => { e.preventDefault(); runSearch(els.input.value); });
$$('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-query]').forEach(b => b.addEventListener('click', () => { els.input.value = b.dataset.query; runSearch(b.dataset.query); }));
els.newSearchBtn.addEventListener('click', resetHome);
els.settingsBtn.addEventListener('click', () => els.dialog.showModal());
els.saveSettingsBtn.addEventListener('click', () => { saveSettings(); setMode(settings.defaultAi ? 'ai' : 'search'); });

hydrateSettings();
detectRuntime();
