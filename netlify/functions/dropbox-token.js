// Dropbox OAuth PKCE Token Exchange
// Exchanges authorization code for access token (with optional refresh token)

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, code_verifier, redirect_uri } = JSON.parse(event.body);

    if (!code || !code_verifier) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing code or code_verifier' }) 
      };
    }

    // Exchange code for token using Dropbox API
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier,
      client_id: process.env.DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_CLIENT_SECRET,
    });

    // Only include redirect_uri if provided (must match what was used in authorize URL)
    if (redirect_uri) {
      params.append('redirect_uri', redirect_uri);
    }

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Dropbox token error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error_description || data.error || 'Token exchange failed' }),
      };
    }

    // Return tokens to client
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        account_id: data.account_id,
      }),
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
