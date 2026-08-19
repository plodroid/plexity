const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'cache-control': 'no-store'
  }
});

export default async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const workerBase = String(process.env.PLEXITY_WORKER_URL || '').trim().replace(/\/$/, '');
  if (!workerBase) {
    return json({
      error: 'PLEXITY_WORKER_URL is not configured.',
      aiUnavailable: true,
      sources: []
    }, 503);
  }

  let body;
  try { body = await req.text(); }
  catch { return json({ error: 'Unable to read request body' }, 400); }

  try {
    const upstream = await fetch(`${workerBase}/api/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    console.warn('Cloudflare Worker proxy failed', error);
    return json({
      error: 'Cloudflare Worker is temporarily unreachable.',
      aiUnavailable: true,
      sources: []
    }, 503);
  }
};
