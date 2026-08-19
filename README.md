# Plexity

A Sherlock-style public username discovery search engine.

Type a username once and Plexity checks public profile URL patterns across dozens of sites, including GitHub, YouTube, TikTok, Reddit, Twitch, GitLab, SoundCloud, Pinterest, Instagram, X, Threads, Telegram, Keybase, Kaggle, Docker Hub, npm, Replit, Scratch, Vimeo, Behance, Dribbble, Flickr, Last.fm, Letterboxd, Chess.com, Lichess, Linktree, Ko-fi, Patreon, itch.io and more.

## Architecture

- `index.html`, `styles.css`, `app.js` — static frontend
- `cloudflare-worker/` — server-side public profile checker
- GitHub Pages workflow — deploys the frontend
- Cloudflare Worker endpoint — checks profile pages without browser CORS issues

## Result confidence

- **Found** — the public profile URL returned a normal successful page and did not match known missing-account markers.
- **Possible** — the platform blocks automated verification, returns an ambiguous page, rate-limits the scanner, or otherwise cannot be confidently verified.
- **Not found** — the platform returned a missing-page response or a known missing-account page.

A URL match does not prove that accounts on different services belong to the same person.

## Privacy

Plexity only checks publicly reachable web pages. It does not log in to services, bypass access controls, or access private account information.
