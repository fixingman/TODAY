// netlify/functions/ai-assist.js
// Provider-agnostic AI assistant proxy for TODAY.
// Supports Gemini 2.5 Flash (default, free) and Claude Haiku (private deployment).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async function(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let body;
  try { 
    body = JSON.parse(event.body); 
  } catch(e) { 
    return { 
      statusCode: 400, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON in request body' })
    };
  }

  const { provider = 'gemini', messages, systemPrompt, apiKey: rawClientKey } = body;
  if (!messages || !Array.isArray(messages)) {
    return { 
      statusCode: 400, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing messages array' })
    };
  }

  // Strip any non-ASCII characters that would cause ByteString errors
  const clientKey = rawClientKey
    ? rawClientKey.replace(/[^\x20-\x7E]/g, '').trim()
    : '';

  try {
    let responseText;

    // ── Gemini 2.5 Flash ─────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || clientKey;
      if (!apiKey) {
        return { 
          statusCode: 400, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No API key — enter your Gemini key in Connections' })
        };
      }

      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const geminiBody = {
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      };
      if (systemPrompt) {
        geminiBody.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      );

      const rawText = await res.text();
      
      if (!res.ok) {
        // Try to parse as JSON error
        let errorMsg = `Gemini API error (${res.status})`;
        try {
          const errData = JSON.parse(rawText);
          errorMsg = errData?.error?.message || errorMsg;
        } catch(e) {
          // If response is HTML, give a clear message
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            errorMsg = 'Invalid API key or model not available';
          }
        }
        return { 
          statusCode: res.status, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: errorMsg })
        };
      }

      // Parse successful response
      let data;
      try {
        data = JSON.parse(rawText);
      } catch(e) {
        return { 
          statusCode: 500, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON from Gemini API' })
        };
      }
      
      responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!responseText) {
        // Check for blocked content
        const blockReason = data?.candidates?.[0]?.finishReason;
        if (blockReason === 'SAFETY') {
          responseText = '{"message":"Content filtered by safety settings","actions":[{"label":"Dismiss","type":"dismiss","payload":{}}]}';
        } else {
          return { 
            statusCode: 500, 
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Empty response from Gemini' })
          };
        }
      }
    }

    // ── Claude Haiku ──────────────────────────────────────────────────────────
    else if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY || clientKey;
      if (!apiKey) {
        return { 
          statusCode: 400, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No API key — enter your Claude key in Connections' })
        };
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt || '',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const rawText = await res.text();

      if (!res.ok) {
        let errorMsg = `Claude API error (${res.status})`;
        try {
          const errData = JSON.parse(rawText);
          errorMsg = errData?.error?.message || errorMsg;
        } catch(e) {
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            errorMsg = 'Invalid API key or service unavailable';
          }
        }
        return { 
          statusCode: res.status, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: errorMsg })
        };
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch(e) {
        return { 
          statusCode: 500, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON from Claude API' })
        };
      }
      
      responseText = data?.content?.[0]?.text || '';
    }

    else {
      return { 
        statusCode: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Unknown provider: ${provider}` })
      };
    }

    // Parse structured JSON response from AI
    let parsed;
    try {
      const clean = responseText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      parsed = JSON.parse(clean);
    } catch(e) {
      // If AI didn't return valid JSON, wrap the text
      parsed = { message: responseText.slice(0, 200), actions: [{ label: 'Dismiss', type: 'dismiss', payload: {} }] };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };

  } catch(e) {
    return { 
      statusCode: 500, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error: ' + (e.message || 'unknown') })
    };
  }
};
