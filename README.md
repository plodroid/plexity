# Plexity

Plexity is a static, GitHub-Pages-friendly AI search interface. The language model runs directly in the visitor's browser through WebGPU, so there is no Ollama process, no always-on home PC, and no AI API key required.

## How it works

1. Plexity searches configured/public browser-accessible sources.
2. Search-result snippets are shown as clickable sources.
3. In **AI Answer** mode, WebLLM downloads a compatible local model into the visitor's browser cache and runs inference on their GPU.
4. The model receives the query plus source snippets and generates a cited summary locally.

## AI models

Default:

- `Llama-3.2-1B-Instruct-q4f16_1-MLC` — roughly 879 MB of required VRAM according to WebLLM's prebuilt configuration.

Optional:

- `Llama-3.2-3B-Instruct-q4f16_1-MLC` — better responses but requires substantially more GPU memory.

The first AI query downloads the selected model. Future loads can reuse the browser cache.

## Search providers

Because GitHub Pages is static hosting, Plexity cannot securely run a server-side search proxy. The browser currently tries:

- an optional user-configured **SearXNG JSON endpoint** (best option for broad web results), then
- DuckDuckGo's browser-accessible Instant Answer API, and
- Wikipedia search as a fallback.

Public SearXNG instances can change CORS/rate-limit policies, so Plexity does not hard-code one as a guaranteed dependency. Open Settings in the site to provide an endpoint that supports `format=json` and browser CORS.

## Deploy on GitHub Pages

A Pages workflow is included at `.github/workflows/pages.yml`.

After merging to `main`:

1. Open **Repository Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** if it is not already selected.
3. The included workflow deploys the static site on pushes to `main`.

For this repository the expected project-site URL is:

`https://plodroid.github.io/plexity/`

## Browser requirements

AI mode needs a WebGPU-capable browser/device. Search mode still works without WebGPU.

## Privacy

AI inference happens in the browser. The query still has to be sent to whichever search provider is used, because live web search cannot happen without contacting a search service.

## Tech

- HTML/CSS/vanilla JavaScript
- WebLLM (`@mlc-ai/web-llm`) loaded as an ES module
- WebGPU
- GitHub Pages
- SearXNG-compatible JSON search
