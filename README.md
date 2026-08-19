# Plexity

A Sherlock-style public username discovery search engine that runs entirely in the browser.

Type a username once and Plexity prepares public profile candidates across dozens of sites. Where a public browser-accessible API exists, Plexity also verifies the username live.

## Architecture

- `index.html`, `styles.css`, `app.js` — the whole app
- GitHub Pages workflow — deploys the static site
- No Cloudflare Worker
- No backend
- No API keys
- No paid services

## Result confidence

- **Verified** — a public API confirmed that the username exists on that service.
- **Candidate** — Plexity generated the exact public profile URL or username-search URL for that platform, but the browser cannot safely/reliably verify it because of cross-origin restrictions or because the platform has no suitable public API.

Plexity intentionally does not label an unverified profile as found.

## Privacy

Plexity only uses public URLs and public API responses. It does not log in to services, bypass access controls, or access private account information.

A username match does not prove that accounts on different services belong to the same person.
