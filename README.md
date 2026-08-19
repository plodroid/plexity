# Plexity

Plexity is a Sherlock-inspired public username discovery search engine with a warm Apple-inspired interface.

## How it works

- The frontend lives in `public/`.
- A Netlify Function at `/api/search` searches public web indexes for the username and `@username`.
- Plexity combines results from public metasearch/search sources, deduplicates them, and ranks exact username matches higher.
- Sherlock Project site definitions are used as a **verification layer** for likely profile results and a small set of major public platforms.
- Plexity does **not** dump every known website with `/username` appended to it.
- NSFW Sherlock entries are excluded.
- No Cloudflare Worker, paid API key, login bypass, or private-data access is used.

## Result states

- **Found** — a strong public web match or a Sherlock-verified public profile.
- **Possible** — a public search result mentions the username but is not strong enough to call a confirmed profile match.

Plexity only works with publicly indexed/reachable information. Matching usernames across websites do not prove the accounts belong to the same person.

## Search sources

Plexity attempts SearXNG public instances first, using the public instance list from `searx.space`. If that does not return enough usable results, it falls back to server-side DuckDuckGo and Bing result pages. Sherlock is then used to verify likely profile URLs rather than generate hundreds of candidate links.

## Deploy

Connect this repository to Netlify. `netlify.toml` publishes the `public` directory and deploys `netlify/functions/search.mjs` automatically.
