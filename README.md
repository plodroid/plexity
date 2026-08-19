# Plexity

Plexity is a Sherlock-style public username discovery search engine with a warm Apple-inspired interface.

## How it works

- The frontend lives in `public/`.
- A Netlify Function at `/api/search` performs the cross-site checks server-side.
- The scanner loads the Sherlock Project's public site definitions and uses their URL patterns and detection rules.
- NSFW entries are excluded.
- No Cloudflare Worker, paid API key, login bypass, or private-data access is used.

## Result states

- **Found** — the site's configured Sherlock detection rule indicates the public username/profile exists.
- **Unclear** — the site blocked the request, timed out, rate-limited, or could not be confidently classified.
- **Not found** — the configured missing-account signal was detected.

A matching username across multiple sites does not prove those accounts belong to the same person.

## Deploy

Connect this repository to Netlify. `netlify.toml` publishes the `public` directory and deploys `netlify/functions/search.mjs` automatically.

The site needs Netlify Functions for full Sherlock-style checking; a plain GitHub Pages deployment cannot reliably scan arbitrary websites because browsers enforce cross-origin restrictions.
