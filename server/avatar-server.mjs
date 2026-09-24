/**
 * Aurrum AI avatar — secure Anam session token server (Node 18+, no deps).
 *
 * The browser never sees the Anam API key. It asks this server for a
 * short-lived session token; only this server calls Anam with the key.
 *
 *   GET  /api/avatar/status   → { configured: boolean }
 *   POST /api/avatar/session  → { sessionToken }
 *
 * Run:  npm run avatar-server      (Vite proxies /api to it in development)
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// --- tiny .env loader (only fills variables not already set) ---
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const ANAM_API = 'https://api.anam.ai';

// Stock cara-4 avatar (English, female voice). Override in .env with your own.
// To create your own: upload a photo at https://lab.anam.ai → copies in <2 min.
const CARA4_AVATAR_ID = '30fa96d0-26c4-4e55-94a0-517025942e18'; // Anam stock Cara 4
const CARA4_VOICE_ID  = '6bfbe25a-979d-40f3-a92b-5394170af54b'; // English female

const {
  ANAM_API_KEY: KEY,
  ANAM_PERSONA_ID: PERSONA_ID,
  ANAM_AVATAR_ID:  AVATAR_ID  = CARA4_AVATAR_ID,
  ANAM_VOICE_ID:   VOICE_ID   = CARA4_VOICE_ID,
  ANAM_LLM_ID:     LLM_ID,
  AVATAR_SERVER_PORT: PORT = '8787',
} = process.env;

const configured = Boolean(KEY);

const ELENA_SYSTEM_PROMPT = `You are Elena, a warm and knowledgeable career advisor for Aurrum Careers.
You help people with CVs, cover letters, LinkedIn profiles, interview preparation, job searching, and career strategy.
Keep answers natural, friendly and concise — this is a spoken conversation, not an article.
Use short sentences. Pause naturally with '...'. Speak warmly as if talking to a friend.
Always refer to Aurrum Careers services when relevant.`;

// Each session costs money: limit token requests per visitor IP.
const RATE = { windowMs: 10 * 60_000, max: 6 };
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE.max;
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function createSessionToken() {
  const personaConfig = {
    ...(PERSONA_ID ? { personaId: PERSONA_ID } : {}),
    name: 'Elena',
    avatarId: AVATAR_ID,
    voiceId: VOICE_ID,
    ...(LLM_ID ? { llmId: LLM_ID } : {}),
    systemPrompt: ELENA_SYSTEM_PROMPT,
    directorNotes: {
      presetStyle: 'warm',
      expressivity: 0.6,
    },
  };

  const r = await fetch(`${ANAM_API}/v1/auth/session-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
    },
    body: JSON.stringify({ personaConfig }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || !json?.sessionToken) {
    throw new Error(`Anam ${r.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json.sessionToken;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

  if (req.method === 'GET' && url.pathname === '/api/avatar/status') {
    return send(res, 200, { configured });
  }
  if (req.method === 'POST' && url.pathname === '/api/avatar/session') {
    if (!configured) return send(res, 503, { error: 'Live avatar is not configured on the server.' });
    if (limited(ip)) return send(res, 429, { error: 'Too many sessions — please try again in a few minutes.' });
    try {
      return send(res, 200, { sessionToken: await createSessionToken() });
    } catch (err) {
      console.error('[avatar-server]', err.message);
      return send(res, 502, { error: 'Could not start the live avatar.' });
    }
  }
  send(res, 404, { error: 'Not found' });
}).listen(Number(PORT), () => {
  console.log(`[avatar-server] http://localhost:${PORT}  configured=${configured}`);
  if (!configured) {
    console.log('[avatar-server] Set ANAM_API_KEY in .env to enable the live avatar.');
    console.log('[avatar-server] Get a free key at https://lab.anam.ai');
  }
});
