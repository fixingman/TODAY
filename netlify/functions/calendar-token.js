// Separate read-only Calendar consent; never reads or replaces Gmail tokens.
const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const reply = (statusCode, data) => ({ statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(data) });

exports.handler = async event => {
  const separateClient = process.env.CALENDAR_CLIENT_ID || process.env.CALENDAR_CLIENT_SECRET;
  const clientId = separateClient ? process.env.CALENDAR_CLIENT_ID : process.env.GMAIL_CLIENT_ID;
  const secret = separateClient ? process.env.CALENDAR_CLIENT_SECRET : process.env.GMAIL_CLIENT_SECRET;
  if (event.httpMethod === 'GET') return reply(200, { client_id: clientId || '' });
  if (event.httpMethod !== 'POST') return reply(405, { error: 'method_not_allowed' });
  if (!clientId || !secret) return reply(503, { error: 'calendar_not_configured' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'invalid_request' }); }
  if (!body || typeof body !== 'object') return reply(400, { error: 'invalid_request' });
  const { code, code_verifier, redirect_uri, refresh_token } = body;
  const params = new URLSearchParams({ client_id: clientId, client_secret: secret });
  if (refresh_token) {
    if (typeof refresh_token !== 'string' || refresh_token.length > 4096)
      return reply(400, { error: 'invalid_request' });
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refresh_token);
  } else {
    if (typeof code !== 'string' || !code || code.length > 4096 ||
        typeof code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier))
      return reply(400, { error: 'invalid_request' });
    try {
      const uri = new URL(redirect_uri);
      if (uri.username || uri.password || uri.search || uri.hash || uri.pathname !== '/' ||
          (uri.protocol !== 'https:' && !(uri.protocol === 'http:' && uri.hostname === '127.0.0.1')))
        return reply(400, { error: 'invalid_redirect' });
    } catch { return reply(400, { error: 'invalid_redirect' }); }
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('code_verifier', code_verifier);
    params.set('redirect_uri', redirect_uri);
  }
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(), signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok) return reply(response.status, {
      error: ['invalid_grant', 'unauthorized_client'].includes(data.error) ? data.error : 'token_exchange_failed',
    });
    // Missing/denied consent must not be presented as a successful connection.
    if (code && !String(data.scope || '').split(' ').includes(SCOPE))
      return reply(403, { error: 'calendar_scope_missing' });
    if (typeof data.access_token !== 'string' || !data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0)
      return reply(502, { error: 'invalid_token_response' });
    return reply(200, { access_token: data.access_token, refresh_token: data.refresh_token,
      expires_in: data.expires_in });
  } catch { return reply(502, { error: 'token_service_unavailable' }); }
};
