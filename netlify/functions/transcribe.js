// netlify/functions/transcribe.js
// Voice note transcription for TODAY (v2.24.0).
// Receives a short audio clip (base64), sends to Gemini, returns plain text.
// Unlike meeting-extract.js there is no chunking, no context, no action-item
// extraction — just "what was said", dropped straight into the add-bar input.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://today-here.netlify.app',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const _json = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return _json(405, { error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return _json(400, { error: 'Invalid JSON in request body' });
  }

  const { audioData, mimeType, apiKey: rawClientKey } = body;
  if (!audioData || typeof audioData !== 'string') {
    return _json(400, { error: 'Missing audioData (base64 string)' });
  }

  const clientKey = rawClientKey
    ? rawClientKey.replace(/[^\x20-\x7E]/g, '').trim()
    : '';
  const apiKey = process.env.GEMINI_API_KEY || clientKey;
  if (!apiKey) {
    return _json(400, { error: 'No API key — enter your Gemini key in Connections' });
  }

  const geminiBody = {
    contents: [{
      role: 'user',
      parts: [
        {
          text: 'Transcribe exactly what is spoken in this audio. ' +
                'Return only the spoken words — no punctuation choices, no commentary, ' +
                'no formatting. Just the words as they were said.',
        },
        { inlineData: { mimeType: mimeType || 'audio/mp4', data: audioData } },
      ],
    }],
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  try {
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
      let errorMsg = `Gemini API error (${res.status})`;
      try {
        const errData = JSON.parse(rawText);
        const geminiMsg = errData?.error?.message || '';
        const status   = errData?.error?.status  || '';
        if (res.status === 429 || status === 'RESOURCE_EXHAUSTED') {
          errorMsg = 'Quota exceeded — ' + (geminiMsg || 'check your plan and billing');
        } else if (geminiMsg) {
          errorMsg = (res.status === 401 || res.status === 403)
            ? 'Invalid API key — ' + geminiMsg
            : geminiMsg;
        }
      } catch (e) { /* keep default */ }
      return _json(res.status, { error: errorMsg });
    }

    let data;
    try { data = JSON.parse(rawText); } catch (e) {
      return _json(502, { error: 'Invalid response from Gemini' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return _json(200, { text });

  } catch (e) {
    return _json(502, { error: 'Network error reaching Gemini: ' + e.message });
  }
};
