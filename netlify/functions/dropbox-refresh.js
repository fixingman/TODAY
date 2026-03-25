// Dropbox OAuth Token Refresh
// Exchanges refresh token for new access token

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { refresh_token } = JSON.parse(event.body);

    if (!refresh_token) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing refresh_token' }) 
      };
    }

    // Refresh the token using Dropbox API
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_CLIENT_SECRET,
    });

    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Dropbox refresh error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error_description || data.error || 'Token refresh failed' }),
      };
    }

    // Return new access token to client
    // Note: refresh_token is NOT returned on refresh - keep using the original
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
      }),
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
