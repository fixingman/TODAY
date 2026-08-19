// netlify/functions/meeting-extract.js
// Meeting mode audio → action items, for TODAY (v2.22.0).
// Gemini-only: it is the sole supported provider with native audio input.
// Receives one ~6-min audio chunk per call plus the rolling context from previous
// chunks; returns extracted action items and an updated context. The transcript
// itself is produced inside Gemini and never included in the response — the
// meeting leaves behind only tasks (privacy stance: see memory/architecture/Connections.md).

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

  const { audioChunk, mimeType, userName, rollingContext, capturedMine, apiKey: rawClientKey } = body;
  if (!audioChunk || typeof audioChunk !== 'string') {
    return _json(400, { error: 'Missing audioChunk (base64)' });
  }

  // Strip any non-ASCII characters that would cause ByteString errors
  const clientKey = rawClientKey
    ? rawClientKey.replace(/[^\x20-\x7E]/g, '').trim()
    : '';
  const apiKey = process.env.GEMINI_API_KEY || clientKey;
  if (!apiKey) {
    return _json(400, { error: 'No API key — enter your Gemini key in Connections' });
  }

  const name = (userName || '').slice(0, 60).trim() || 'the user';
  const context = (rollingContext || '').slice(0, 4000);
  const alreadyCaptured = Array.isArray(capturedMine) && capturedMine.length
    ? capturedMine.slice(0, 20).map(t => '- ' + String(t).slice(0, 100)).join('\n')
    : '';

  const systemPrompt =
    `You are listening to one segment of a live meeting on behalf of ${name}. ` +
    `Transcribe it internally (do NOT output the transcript) and extract concrete action items.\n` +
    `Rules:\n` +
    `- An action item is a specific commitment or assignment ("send X", "book Y", "follow up with Z"), not a discussion topic.\n` +
    `- A self-commitment ("I'll...", "I will...", "let me...", "I need to...") belongs to WHOEVER IS SPEAKING that line — track speaker turns across the segment (and the rolling context's speaker hints) even when names are never stated at that exact moment. If the conversation reveals that speaker's name elsewhere (someone greets them, addresses them, or they introduce themselves), tag "owner" with that real name — do not assume every unnamed "I'll..." is ${name} just because it's unnamed. Meetings have more than one voice, and more than one person says "I'll handle it" about their own task.\n` +
    `- Only fall back to assuming a self-commitment is ${name}'s when the speaker truly cannot be distinguished from ${name} by voice or context (e.g. a single-speaker segment, or ${name} is the only participant whose turns are ever identifiable). This is the last resort, not the default.\n` +
    `- "mine" is true when the item is explicitly assigned to ${name} by name, OR the self-commitment above resolves to ${name} (by identified speaker, or by the last-resort fallback). ${name} is often never spoken aloud in their own meeting — being unnamed does not by itself make an item ${name}'s. Treat ${name} as a proper noun — do not match it as a common word or auxiliary verb.\n` +
    `- "mine" is false when a different, identifiable speaker or named person is the clear owner — whether assigned to them by someone else ("Sam will send it") or self-committed by them ("I'll send it," said by Sam).\n` +
    `- "owner" is the first name of whoever owns the item (the assignee, or the speaker who self-committed) — filled in whenever the conversation makes that name knowable, even if it isn't ${name}. Leave owner "" only when no name is knowable at all, in which case mine follows the last-resort fallback above. If owner is "" or equals ${name}, mine MUST be true; if owner is any other name, mine MUST be false — never let the two fields disagree.\n` +
    `- Phrase each item as a short imperative task (max 12 words), the way ${name} would write it in a todo list.\n` +
    `- Phrase each item in the language spoken in the meeting — do not translate to English.\n` +
    `- Do not repeat items already listed in the prior context or in the already-captured list below.\n` +
    (alreadyCaptured ? `Already captured tasks for ${name} — do not re-add these or close variations:\n${alreadyCaptured}\n` : '') +
    `- updatedContext: carry forward the prior context, appending this segment's speaker hints (who is who) and any open threads, max 150 words total. Plain text, no transcript.\n` +
    `Reply ONLY with JSON: {"actionItems":[{"text":"...","owner":"...","mine":true}],"updatedContext":"..."}\n` +
    `If the segment contains no action items, reply {"actionItems":[],"updatedContext":"..."}.`;

  const geminiBody = {
    contents: [{
      role: 'user',
      parts: [
        { text: 'Prior context from earlier in this meeting:\n' + (context || '(meeting just started)') },
        { inlineData: { mimeType: mimeType || 'audio/webm', data: audioChunk } },
      ],
    }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.3,
      thinkingConfig: { thinkingBudget: 0 }, // Disable thinking — prevents Netlify 10s timeout
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
        const status   = errData?.error?.status || '';
        if (res.status === 429 || status === 'RESOURCE_EXHAUSTED') {
          // Extract the specific quota metric name from Gemini's error details if present
          const details = errData?.error?.details || [];
          const metaDetail = details.find(d => d['@type']?.includes('QuotaFailure'));
          const violation = metaDetail?.violations?.[0]?.quotaMetric || '';
          // e.g. "generate_content_free_tier_input_token_count" → "free-tier input token count"
          const metricHint = violation
            ? ' (' + violation.replace(/generate_content_/i, '').replace(/_/g, ' ') + ')'
            : '';
          errorMsg = `Quota exceeded${metricHint} — ${geminiMsg || 'check your plan and billing'}`;
        } else if (geminiMsg) {
          errorMsg = res.status === 401 || res.status === 403
            ? 'Invalid API key — ' + geminiMsg
            : geminiMsg;
        } else if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
          errorMsg = 'Invalid API key or model not available';
        }
      } catch (e) { /* keep default errorMsg */ }
      return _json(res.status, { error: errorMsg });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return _json(500, { error: 'Invalid JSON from Gemini API' });
    }

    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!responseText) {
      // A blocked/empty chunk is not fatal to the meeting — return an empty result
      return _json(200, { actionItems: [], updatedContext: context });
    }

    let parsed;
    try {
      const clean = responseText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      return _json(200, { actionItems: [], updatedContext: context });
    }

    const items = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
    // Safety net for a real inconsistency seen in practice: the model sometimes
    // returns owner === name (or "") alongside mine:false. Don't trust the two
    // fields to agree on their own — force it here rather than only in the prompt.
    const nameTokens = name.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
    return _json(200, {
      actionItems: items
        .filter(i => i && typeof i.text === 'string' && i.text.trim())
        .map(i => {
          const owner = (typeof i.owner === 'string' ? i.owner : '').slice(0, 40);
          const ownerIsMe = !owner.trim() || nameTokens.includes(owner.trim().toLowerCase());
          return {
            text: i.text.trim().slice(0, 200),
            owner,
            // owner is the ground truth for "mine" — the model's raw boolean is never
            // trusted on its own, in either direction. A named other-person owner
            // forces mine:false even if the model said true, and vice versa.
            mine: ownerIsMe,
          };
        }),
      updatedContext: (typeof parsed.updatedContext === 'string' ? parsed.updatedContext : context).slice(0, 4000),
    });
  } catch (e) {
    return _json(500, { error: 'Server error: ' + (e.message || 'unknown') });
  }
};
