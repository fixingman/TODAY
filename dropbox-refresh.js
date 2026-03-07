// netlify/functions/dropbox-refresh.js
// Uses a stored refresh_token to get a new short-lived access_token.
// Called automatically by the client when an access token expires.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { refresh_token } = body;
  if (!refresh_token) {
    return { statusCode: 400, body: 'Missing refresh_token' };
  }

  const clientId     = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: 'Server misconfigured — env vars missing' };
  }

  try {
    const params = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     clientId,
      client_secret: clientSecret,
    });

    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.error_description || data.error || 'Refresh failed' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.access_token,
        expires_in:   data.expires_in,
      }),
    };

  } catch(e) {
    return { statusCode: 500, body: 'Refresh error: ' + (e.message || 'unknown') };
  }
};
