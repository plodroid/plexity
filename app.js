const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  form: $('#searchForm'), input: $('#searchInput'), hero: $('#hero'), results: $('#resultsView'), queryTitle: $('#queryTitle'),
  answerCard: $('#answerCard'), answerText: $('#answerText'), answerMeta: $('#answerMeta'), sourceList: $('#sourceList'), sourceCount: $('#sourceCount'),
  statusCard: $('#statusCard'), statusTitle: $('#statusTitle'), statusText: $('#statusText'), progressBar: $('#progressBar'), gpuBadge: $('#gpuBadge'),
  settingsBtn: $('#settingsBtn'), dialog: $('#settingsDialog'), modelSelect: $('#modelSelect'), searxEndpoint: $('#searxEndpoint'), defaultAi: $('#defaultAi'),
  saveSettingsBtn: $('#saveSettingsBtn'), newSearchBtn: $('#newSearchBtn')
};

const defaults = {
  model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
  searx: '',
  defaultAi: true
};

let settings = loadSettings();
let mode = settings.defaultAi ? 'ai' : 'search';
let engine = null;
let engineModel = null;
let webllmModule = null;
let gpuInfo = { available: false, shaderF16: false, adapter: null };

function loadSettings() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('plexity-settings') || '{}') }; }
  catch { return { ...defaults }; }
}
function saveSettings() {
  settings = { model: els.modelSelect.value, searx: els.searxEndpoint.value.trim(), defaultAi: els.defaultAi.checked };
  localStorage.setItem('plexity-settings', JSON.stringify(settings));
}
function hydrateSettings() {
  if (![...els.modelSelect.options].some(o => o.value === settings.model)) settings.model = defaults.model;
  els.modelSelect.value = settings.model;
  els.searxEndpoint.value = settings.searx;
  els.defaultAi.checked = settings.defaultAi;
  setMode(settings.defaultAi ? 'ai' : 'search');
}

async function detectWebGPU() {
  if (!('gpu' in navigator)) {
    gpuInfo = { available: false, shaderF16: false, adapter: null };
    els.gpuBadge.textContent = 'WebGPU unavailable';
    els.gpuBadge.classList.add('error');
    return gpuInfo;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const shaderF16 = adapter.features?.has?.('shader-f16') || false;
    gpuInfo = { available: true, shaderF16, adapter };
    els.gpuBadge.textContent = shaderF16 ? 'WebGPU ready · FP16' : 'WebGPU ready · compatible mode';
    els.gpuBadge.classList.remove('error');
    els.gpuBadge.classList.add('ok');
    return gpuInfo;
  } catch {
    gpuInfo = { available: false, shaderF16: false, adapter: null };
    els.gpuBadge.textContent = 'WebGPU unavailable';
    els.gpuBadge.classList.add('error');
    return gpuInfo;
  }
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

function normalizeUrl(url) {
  try { return new URL(url).href; } catch { return '#'; }
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'source'; }
}
function stripHtml(text = '') {
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || '';
}
function escapeHtml(s = '') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function renderSources(results) {
  els.sourceCount.textContent = results.length;
  if (!results.length) {
    els.sourceList.innerHTML = '<div class="empty">No browser-safe web source returned results. Add a SearXNG endpoint in Settings for full web search.</div>';
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
  const base = settings.searx.replace(/\/$/, '');
  const url = new URL(base);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`SearXNG HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 10).map(r => ({ title: r.title, url: r.url, snippet: stripHtml(r.content || '') }));
}

async function fetchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=8`;
  const res = await fetch(url, { headers: { 'Api-User-Agent': 'Plexity/1.0 (browser app)' } });
  if (!res.ok) throw new Error('Wikipedia search failed');
  const data = await res.json();
  return (data.pages || []).map(p => ({
    title: p.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title.replace(/ /g, '_'))}`,
    snippet: stripHtml(p.excerpt || p.description || '')
  }));
}

async function fetchDuckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('DuckDuckGo API failed');
  const data = await res.json();
  const out = [];
  if (data.AbstractURL && data.AbstractText) out.push({ title: data.Heading || query, url: data.AbstractURL, snippet: data.AbstractText });
  const flatten = (topics) => topics.flatMap(t => t.Topics ? flatten(t.Topics) : [t]);
  for (const t of flatten(data.RelatedTopics || []).slice(0, 7)) {
    if (t.FirstURL && t.Text) out.push({ title: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text });
  }
  return out;
}

async function searchWeb(query) {
  setStatus('Searching the web', 'Looking for useful sources…', 12);
  const seen = new Set();
  const combined = [];
  const add = (items) => {
    for (const r of items) {
      if (!r?.url || seen.has(r.url)) continue;
      seen.add(r.url); combined.push(r);
      if (combined.length >= 10) break;
    }
  };

  if (settings.searx) {
    try { add(await fetchSearx(query)); }
    catch (err) { console.warn('SearXNG unavailable:', err); }
  }
  if (combined.length < 5) {
    const settled = await Promise.allSettled([fetchDuckDuckGo(query), fetchWikipedia(query)]);
    for (const result of settled) if (result.status === 'fulfilled') add(result.value);
  }
  return combined.slice(0, 10);
}

function f32FallbackFor(model) {
  return model.replace('q4f16_1-MLC', 'q4f32_1-MLC');
}

function isFp16Model(model) {
  return model.includes('q4f16_1-MLC');
}

async function createEngine(model) {
  setStatus('Loading local AI', 'Downloading the model on this device. The first load can be large; later visits use the browser cache.', 20);
  webllmModule ||= await import('https://esm.run/@mlc-ai/web-llm');
  return webllmModule.CreateMLCEngine(model, {
    initProgressCallback: (p) => {
      const raw = typeof p.progress === 'number' ? p.progress * 100 : 30;
      setStatus('Loading local AI', p.text || 'Preparing WebGPU model…', Math.max(20, Math.min(92, raw)));
    }
  });
}

async function ensureEngine() {
  if (engine) return engine;
  if (!gpuInfo.available) await detectWebGPU();
  if (!gpuInfo.available) throw new Error('WebGPU is not available in this browser. Use Search mode or a recent WebGPU-capable browser.');

  let requestedModel = settings.model || defaults.model;
  let selectedModel = requestedModel;

  if (isFp16Model(requestedModel) && !gpuInfo.shaderF16) {
    selectedModel = f32FallbackFor(requestedModel);
    setStatus('Using compatibility mode', 'Your GPU does not expose shader-f16, so Plexity switched to the f32 model automatically.', 18);
  }

  try {
    engine = await createEngine(selectedModel);
    engineModel = selectedModel;
    return engine;
  } catch (err) {
    const message = String(err?.message || err);
    const shaderFailure = /ShaderModule|shader-f16|compute stage|index_kernel/i.test(message);
    if (shaderFailure && isFp16Model(selectedModel)) {
      const fallback = f32FallbackFor(selectedModel);
      console.warn('FP16 WebGPU model failed, retrying with f32:', err);
      setStatus('Retrying in compatibility mode', 'Your GPU/driver rejected the FP16 shader. Retrying with the more compatible f32 model…', 22);
      engine = null;
      engine = await createEngine(fallback);
      engineModel = fallback;
      return engine;
    }
    throw err;
  }
}

function buildContext(results) {
  return results.slice(0, 8).map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet || '(no snippet)'}`).join('\n\n');
}

async function generateAnswer(query, results) {
  const localEngine = await ensureEngine();
  setStatus('Writing answer', 'The model is reading the search results locally in your browser…', 94);
  els.answerCard.classList.remove('hidden');
  els.answerText.textContent = '';
  const context = buildContext(results);
  const prompt = `You are Plexity, a concise web search assistant. Answer the user's question using only the supplied search-result snippets. If the sources are weak or do not support a claim, clearly say so. Cite factual claims inline using [1], [2], etc. Do not invent sources.\n\nQuestion: ${query}\n\nSearch results:\n${context || 'No usable results were returned.'}`;

  const stream = await localEngine.chat.completions.create({
    messages: [
      { role: 'system', content: 'Be useful, precise, and source-grounded. Never pretend you accessed content that is not in the provided snippets.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.25,
    max_tokens: 650,
    stream: true
  });

  let text = '';
  for await (const chunk of stream) {
    text += chunk.choices?.[0]?.delta?.content || '';
    els.answerText.textContent = text;
  }
  const compatibilityNote = engineModel !== settings.model ? ' (compatibility fallback)' : '';
  els.answerMeta.textContent = `Generated locally with ${engineModel || settings.model}${compatibilityNote}. Your query was not sent to an AI API.`;
}

async function runSearch(query) {
  query = query.trim();
  if (!query) return;
  showResults(query);
  els.answerCard.classList.add('hidden');
  els.answerText.textContent = '';
  els.answerMeta.textContent = '';
  els.sourceList.innerHTML = '';
  els.sourceCount.textContent = '0';

  try {
    const results = await searchWeb(query);
    renderSources(results);
    setStatus('Sources ready', `Found ${results.length} source${results.length === 1 ? '' : 's'}.`, 55);

    if (mode === 'ai') {
      try { await generateAnswer(query, results); }
      catch (err) {
        console.error('Plexity AI failed:', err);
        els.answerCard.classList.remove('hidden');
        const message = String(err?.message || err);
        const friendly = /ShaderModule|compute stage|index_kernel/i.test(message)
          ? 'Your GPU driver rejected this WebGPU model shader. Try the Compatible 1B model in Settings, update your browser/GPU driver, then reload Plexity.'
          : message;
        els.answerText.innerHTML = `<span class="error">AI couldn't start:</span> ${escapeHtml(friendly)}\n\nYour web results are still available on the right.`;
        els.answerMeta.textContent = 'Search mode still works even when local AI is unavailable.';
      }
    }
  } catch (err) {
    renderSources([]);
    els.answerCard.classList.remove('hidden');
    els.answerText.innerHTML = `<span class="error">Search failed:</span> ${escapeHtml(err.message)}`;
  } finally {
    clearStatus();
  }
}

els.form.addEventListener('submit', e => { e.preventDefault(); runSearch(els.input.value); });
$$('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-query]').forEach(b => b.addEventListener('click', () => { els.input.value = b.dataset.query; runSearch(b.dataset.query); }));
els.newSearchBtn.addEventListener('click', resetHome);
els.settingsBtn.addEventListener('click', () => els.dialog.showModal());
els.saveSettingsBtn.addEventListener('click', () => {
  const previousModel = settings.model;
  saveSettings();
  setMode(settings.defaultAi ? 'ai' : 'search');
  if (engine && settings.model !== previousModel) {
    engine = null;
    engineModel = null;
  }
});

hydrateSettings();
detectWebGPU();
