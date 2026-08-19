# Plexity

Plexity is a static AI search frontend backed by **Cloudflare Workers + Workers AI**. The website can stay on GitHub Pages or Netlify while the Worker handles live search and AI generation.

## Architecture

1. The frontend sends the query and selected mode to `/api/search`.
2. `plexity-api` searches DuckDuckGo HTML and Wikipedia from the Cloudflare Worker.
3. In **AI Answer** mode, the Worker sends the search context to Cloudflare Workers AI using `@cf/meta/llama-3.2-3b-instruct`.
4. In **Search** mode, Workers AI is skipped completely so search-only requests do not consume AI quota.
5. If Workers AI is unavailable or the free allocation is exhausted, Plexity keeps the search results and shows a fallback message instead of attempting a paid provider.

## Free-plan safety

This project is intended for the **Cloudflare Workers Free plan only**.

- Do not upgrade the Cloudflare account to Workers Paid for this project.
- Do not add a paid AI provider or API key as a fallback.
- `cloudflare-worker/wrangler.jsonc` caps each Worker invocation at 10 ms CPU and 5 subrequests.
- Workers AI quota/rate-limit errors are returned to the frontend as `aiUnavailable` / `aiLimited`, and Plexity falls back to search results.
- The Worker contains no payment credentials and no OpenAI dependency.

Cloudflare's Free-plan quotas are platform limits. When a free allocation is exhausted, operations fail until the quota resets rather than continuing as billable paid usage. Keep the Cloudflare account itself on Workers Free to preserve that behavior.

## Deploy the Cloudflare Worker

From `cloudflare-worker/`:

```bash
npm install
npx wrangler login
npm run deploy
```

Wrangler will print a URL similar to:

```text
https://plexity-api.<your-workers-subdomain>.workers.dev
```

Test it with:

```text
GET https://plexity-api.<your-workers-subdomain>.workers.dev/health
```

The health response should report `service: "plexity-api"` and `billingMode: "free-plan-hard-stop"`.

## Connect the frontend

### Netlify

The included Netlify Function is now only a tiny proxy; it does **not** run OpenAI or another AI provider.

Set this Netlify environment variable to the Worker base URL:

```text
PLEXITY_WORKER_URL=https://plexity-api.<your-workers-subdomain>.workers.dev
```

The existing `/api/search` redirect will then forward requests to Cloudflare.

### GitHub Pages

GitHub Pages cannot provide a server-side `/api/search` route. Before loading `app.js`, set:

```html
<script>
  window.PLEXITY_API_URL = 'https://plexity-api.<your-workers-subdomain>.workers.dev/api/search';
</script>
```

If `PLEXITY_API_URL` is not set, Plexity uses `/api/search`, which is suitable for the Netlify deployment.

## Search fallback

If the Cloudflare backend itself is unreachable, the browser still attempts a Wikipedia search so the UI does not become completely useless.

## Tech

- HTML / CSS / vanilla JavaScript
- Cloudflare Workers
- Cloudflare Workers AI
- DuckDuckGo HTML search + Wikipedia fallback
- Netlify or GitHub Pages frontend hosting
