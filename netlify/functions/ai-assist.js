// netlify/functions/ai-assist.js
// Provider-agnostic AI assistant proxy for TODAY.
// Supports Gemini 2.5 Flash stable (default, free) and Claude Haiku (private deployment).
//
// Key resolution order:
//   1. ENV VAR (GEMINI_API_KEY / ANTHROPIC_API_KEY) — set on the server
//   2. apiKey field from request body — user-supplied key stored in their localStorage
//
// This means: on the maintainer's Netlify deployment, the env var is used.
// On self-hosted forks with no env var, the user's own key is used.
// The key is never logged or stored server-side.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { provider = 'gemini', messages, systemPrompt, apiKey: clientKey } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: 'Missing messages array' };
  }

  try {
    let responseText;

    // ── Gemini 2.5 Flash ─────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || clientKey;
      if (!apiKey) return { statusCode: 500, body: 'No Gemini API key — add GEMINI_API_KEY env var or enter your key in Connections' };

      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        return { statusCode: res.status, body: msg };
      }

      const data = await res.json();
      responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // ── Claude Haiku ──────────────────────────────────────────────────────────
    else if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY || clientKey;
      if (!apiKey) return { statusCode: 500, body: 'No Claude API key — add ANTHROPIC_API_KEY env var or enter your key in Connections' };

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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        return { statusCode: res.status, body: msg };
      }

      const data = await res.json();
      responseText = data?.content?.[0]?.text || '';
    }

    else {
      return { statusCode: 400, body: `Unknown provider: ${provider}` };
    }

    // Parse structured JSON response
    let parsed;
    try {
      const clean = responseText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      parsed = JSON.parse(clean);
    } catch(e) {
      parsed = { message: responseText, actions: [] };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };

  } catch(e) {
    return { statusCode: 500, body: 'AI assist error: ' + (e.message || 'unknown') };
  }
};
