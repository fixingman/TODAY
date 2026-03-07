// netlify/functions/dropbox-token.js
// Exchanges a Dropbox PKCE authorization code for a refresh token.
// The client_secret never leaves this function — it's set as a
// Netlify environment variable: DROPBOX_CLIENT_SECRET

exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { code, code_verifier, redirect_uri } = body;
  if (!code || !code_verifier || !redirect_uri) {
    return { statusCode: 400, body: 'Missing required fields: code, code_verifier, redirect_uri' };
  }

  const clientId     = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: 'Server misconfigured — env vars missing' };
  }

  try {
    const params = new URLSearchParams({
      code,
      grant_type:    'authorization_code',
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri,
      code_verifier,
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
        body: JSON.stringify({ error: data.error_description || data.error || 'Token exchange failed' }),
      };
    }

    // Return only what the client needs — never log or expose client_secret
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        token_type:    data.token_type,
        expires_in:    data.expires_in,
      }),
    };

  } catch(e) {
    return { statusCode: 500, body: 'Token exchange error: ' + (e.message || 'unknown') };
  }
};
