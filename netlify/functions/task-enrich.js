// netlify/functions/task-enrich.js
// Agentic task enrichment — Claude Sonnet 5 with web_search (server tool) and
// search_trello (custom tool, when Trello is connected).
// Returns a card object for the focus block, or { card: null } if nothing useful.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://today-here.netlify.app',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_URL  = 'https://api.anthropic.com/v1/messages';
const TRELLO_API_KEY = 'f24cb0d938ae01e9cbf3feff20df8c1a';
const MAX_TURNS  = 5;   // up from 3 — allows search_trello + web_search in one session
const TIMEOUT_MS = 24000; // leave 2s headroom inside Netlify's 26s function limit

const SYSTEM_PROMPT_BASE = `You are a task enrichment assistant. For the given task, use available tools to find ONE specific actionable piece of information — a phone number, address, price, hours, booking URL, or a directly relevant Trello card. Return ONLY valid JSON in exactly this format:
{"icon":"<single emoji>","headline":"<name or title, max 40 chars>","body":"<key info like phone/price/hours, max 80 chars>","cta":{"label":"<action word, max 10 chars>","href":"<https URL>"}}
CTA label rules: price/specs/info → "Reveal"; booking/reservation/purchase → "Book"; directions/location → "Go"; hours/contact → "Call" or "Visit"; Trello card → "Open"; default → "Open".
If you cannot find useful, specific information, return exactly: {"card":null}
No explanations. No markdown. Only the JSON object.`;

const SYSTEM_PROMPT_TRELLO_ADDON = `
You also have access to search_trello to look for cards on this person's Trello board. Check Trello first — an existing card with a direct URL is more actionable than a web result.`;

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const clientKey = body.apiKey ? String(body.apiKey).replace(/[^\x20-\x7E]/g, '').trim() : '';
  const apiKey = process.env.ANTHROPIC_API_KEY || clientKey;
  if (!apiKey) {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No API key — add your Claude key in Connections' }) };
  }

  const { taskText } = body;
  if (!taskText || typeof taskText !== 'string') {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing taskText' }) };
  }
  if (taskText.length > 500) {
    return { statusCode: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'taskText too long' }) };
  }

  const trelloToken   = body.trelloToken   ? String(body.trelloToken).replace(/[^\w\-]/g, '').slice(0, 128)   : '';
  const trelloBoardId = body.trelloBoardId ? String(body.trelloBoardId).replace(/[^\w]/g, '').slice(0, 32) : '';
  const hasTrello = !!(trelloToken && trelloBoardId);

  const tools = [{ type: 'web_search_20260209', name: 'web_search' }];
  if (hasTrello) {
    tools.push({
      name: 'search_trello',
      description: "Search the user's Trello board for cards related to this task. Returns card titles, URLs, and due dates. Check Trello before doing a web search — an existing card is more actionable.",
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords to search (2–5 words)' },
        },
        required: ['query'],
      },
    });
  }

  const systemPrompt = SYSTEM_PROMPT_BASE + (hasTrello ? SYSTEM_PROMPT_TRELLO_ADDON : '');
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
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 512,
          system: systemPrompt,
          tools,
          messages,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error('[task-enrich] API error', res.status, errBody);
        break;
      }

      const data = await res.json();
      console.log('[task-enrich] turn', turn, 'stop_reason:', data.stop_reason,
        'content_types:', (data.content || []).map(b => b.type).join(','));

      if (data.stop_reason === 'end_turn') {
        const textBlock = (data.content || []).find(b => b.type === 'text');
        if (!textBlock) { console.error('[task-enrich] end_turn but no text block'); break; }
        return _parseCard(textBlock.text, CORS_HEADERS);
      }

      if (data.stop_reason === 'pause_turn') {
        // Anthropic-executed server tool (web_search) — results come back in data.content.
        const assistantBlocks = (data.content || []).filter(b => b.type !== 'tool_result');
        const resultBlocks    = (data.content || []).filter(b => b.type === 'tool_result');
        messages.push({ role: 'assistant', content: assistantBlocks });
        if (resultBlocks.length > 0) messages.push({ role: 'user', content: resultBlocks });
        continue;
      }

      if (data.stop_reason === 'tool_use') {
        // Custom tool call — we execute it and feed results back.
        const assistantContent = data.content || [];
        messages.push({ role: 'assistant', content: assistantContent });

        const toolUseBlocks = assistantContent.filter(b => b.type === 'tool_use');
        if (toolUseBlocks.length === 0) break;

        const toolResults = [];
        for (const tb of toolUseBlocks) {
          let result;
          if (tb.name === 'search_trello') {
            result = await _searchTrello(tb.input && tb.input.query, trelloToken, trelloBoardId);
          } else {
            result = 'Unknown tool: ' + tb.name;
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: result });
        }
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      console.error('[task-enrich] unexpected stop_reason:', data.stop_reason);
      break;
    }
  } catch(e) {
    // Network or timeout — return null card, not cached by client
  }

  return _nullCard(CORS_HEADERS);
};

async function _searchTrello(query, token, boardId) {
  if (!query || !token || !boardId) return 'Trello search unavailable.';
  try {
    const url = 'https://api.trello.com/1/search'
      + '?query='       + encodeURIComponent(String(query).slice(0, 100))
      + '&key='         + TRELLO_API_KEY
      + '&token='       + encodeURIComponent(token)
      + '&modelTypes=cards'
      + '&card_fields=name,shortUrl,due'
      + '&idBoards='    + encodeURIComponent(boardId)
      + '&cards_limit=5';
    const res = await fetch(url);
    if (!res.ok) return 'Trello search failed (HTTP ' + res.status + ').';
    const data = await res.json();
    const cards = (data.cards || []).slice(0, 5);
    if (cards.length === 0) return 'No matching Trello cards found.';
    return cards.map(function(c) {
      const due = c.due ? ' (due ' + String(c.due).slice(0, 10) + ')' : '';
      return '• ' + c.name + due + '\n  ' + c.shortUrl;
    }).join('\n');
  } catch(e) {
    return 'Trello search error.';
  }
}

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
