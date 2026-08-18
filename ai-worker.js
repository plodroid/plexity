const AI_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
let generator = null;
let loading = null;

async function getGenerator() {
  if (generator) return generator;
  if (loading) return loading;

  loading = (async () => {
    const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
    generator = await transformers.pipeline('text-generation', AI_MODEL, {
      device: 'wasm',
      dtype: 'q4',
    });
    return generator;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

self.onmessage = async (event) => {
  const { id, messages, maxNewTokens = 56 } = event.data || {};
  if (!id || !Array.isArray(messages)) return;

  try {
    self.postMessage({ id, type: 'status', status: generator ? 'generating' : 'loading' });
    const pipe = await getGenerator();
    self.postMessage({ id, type: 'status', status: 'generating' });

    const output = await pipe(messages, {
      max_new_tokens: Math.min(72, Math.max(24, maxNewTokens)),
      do_sample: false,
      repetition_penalty: 1.12,
    });

    const value = output?.[0]?.generated_text;
    let text = '';
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        if (value[i]?.role === 'assistant' && value[i]?.content) {
          text = String(value[i].content).trim();
          break;
        }
      }
      if (!text) text = String(value[value.length - 1]?.content || '').trim();
    } else {
      text = String(value || '').trim();
    }

    self.postMessage({ id, type: 'result', text });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: String(error?.message || error) });
  }
};
