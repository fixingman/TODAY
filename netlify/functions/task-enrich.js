// netlify/functions/task-enrich.js
// Agentic task enrichment — Claude with web_search server tool.
// Returns a card object for the focus block, or { card: null } if nothing useful.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://today-here.netlify.app',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TURNS = 3;
const TIMEOUT_MS = 30000;

const SYSTEM_PROMPT = `You are a task enrichment assistant. For the given task, search for ONE specific actionable piece of information — a phone number, address, price, hours, or booking URL. Return ONLY valid JSON in exactly this format:
{"icon":"<single emoji>","headline":"<name or title, max 40 chars>","body":"<key info like phone/price/hours, max 80 chars>","cta":{"label":"<action word, max 10 chars>","href":"<https URL>"}}
If you cannot find useful, specific information, return exactly: {"card":null}
No explanations. No markdown. Only the JSON object.`;

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { taskText } = body;
  if (!taskText || typeof taskText !== 'string') {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing taskText' }) };
  }
  if (taskText.length > 500) {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'taskText too long' }) };
  }

  const messages = [{ role: 'user', content: taskText }];
  const deadline = Date.now() + TIMEOUT_MS;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (Date.now() > deadline) break;

      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages,
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        return { statusCode: res.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'API error ' + res.status }) };
      }
      if (!res.ok) break;

      const data = await res.json();

      if (data.stop_reason === 'end_turn') {
        const textBlock = (data.content || []).find(b => b.type === 'text');
        if (!textBlock) break;
        return _parseCard(textBlock.text, CORS_HEADERS);
      }

      if (data.stop_reason === 'pause_turn') {
        // Token budget exhausted mid-tool-use — continue from where Claude paused
        messages.push({ role: 'assistant', content: data.content });
        continue;
      }

      // max_tokens, refusal, or unexpected stop reason
      break;
    }
  } catch(e) {
    // Network or timeout — return null card, not cached by client
  }

  return _nullCard(CORS_HEADERS);
};

function _nullCard(headers) {
  return {
    statusCode: 200,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ card: null }),
  };
}

function _parseCard(text, headers) {
  try {
    const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const parsed = JSON.parse(clean);

    if (!parsed || parsed.card === null) return _nullCard(headers);

    const headline = typeof parsed.headline === 'string' ? parsed.headline.slice(0, 40) : '';
    if (!headline) return _nullCard(headers);

    const icon = typeof parsed.icon === 'string' ? parsed.icon.slice(0, 8) : '↗';
    const body = typeof parsed.body === 'string' ? parsed.body.slice(0, 80) : '';

    let cta = null;
    if (parsed.cta && typeof parsed.cta.href === 'string' && parsed.cta.href.startsWith('https://')) {
      cta = {
        label: typeof parsed.cta.label === 'string' ? parsed.cta.label.slice(0, 10) : 'Open',
        href: parsed.cta.href.slice(0, 500),
      };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: { icon, headline, body, cta } }),
    };
  } catch(e) {
    return _nullCard(headers);
  }
}
