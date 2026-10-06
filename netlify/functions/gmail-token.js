// Gmail OAuth Token Exchange
// Handles both initial code exchange and token refresh server-side,
// keeping client_secret out of the browser.

exports.handler = async (event) => {
  // GET: return client_id so the browser can build the OAuth redirect URL
  // (client_secret stays server-only)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GMAIL_CLIENT_ID || '' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, code_verifier, redirect_uri, refresh_token } = JSON.parse(event.body);

    let params;
    if (refresh_token) {
      params = new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token,
        client_id:     process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
      });
    } else {
      if (!code || !code_verifier) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing code or code_verifier' }) };
      }
      params = new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        code_verifier,
        redirect_uri,
        client_id:     process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
      });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gmail token error:', data);
      return {
        statusCode: response.status,
        // Keep Google's error code separate from its description: `invalid_grant` on a
        // refresh means the saved sign-in is gone (revoked, password change, or a Testing-mode
        // OAuth app's 7-day expiry) and the client must ask the user to reconnect (BUG-115).
        body: JSON.stringify({ error: data.error || 'token_exchange_failed', error_description: data.error_description || '' }),
      };
    }

    return {
      statusCode: 200,
      headers:    { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_in:    data.expires_in,
        token_type:    data.token_type,
      }),
    };
  } catch (error) {
    console.error('Gmail token exchange error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
