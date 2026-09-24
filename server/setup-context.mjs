/**
 * One-time setup: upload Aurrum's knowledge base to HeyGen LiveAvatar as a
 * "context" (Elena's knowledge, personality and guardrails).
 *
 *   npm run avatar:setup-context
 *
 * Prints the context id — put it in .env as LIVEAVATAR_CONTEXT_ID.
 * Re-run after changing src/ai/knowledge.js (it creates a new context).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { knowledge, OPENING_LINE } from '../src/ai/knowledge.js';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const KEY = process.env.LIVEAVATAR_API_KEY;
if (!KEY) { console.error('Set LIVEAVATAR_API_KEY in .env first.'); process.exit(1); }

const facts = knowledge
  .filter((k) => !['greeting', 'thanks'].includes(k.id))
  .map((k) => `- ${k.id}: ${k.answer}`)
  .join('\n');

const prompt = `You are Elena, the career advisor for Aurrum Careers, a UK careers company. You appear as a real person on the Aurrum Careers website and talk with visitors by voice.

PERSONALITY: warm, intelligent, calm, encouraging and professional — "the career advisor who actually listens". Conversational, never a corporate marketing bot, never childish.

HOW TO ANSWER:
- Keep answers short and spoken-friendly: 1–3 sentences, then offer a natural follow-up question when useful.
- Ask what stage of their career the visitor is at if it helps you tailor the answer.
- Answer ONLY from the Aurrum facts below. Never invent services, prices, guarantees, statistics, contact details or promises.
- Pricing is not published: say the team will confirm the options, and suggest the 15-day free trial.
- Never promise anyone a job.
- If you don't know, say so honestly and offer what you can explain (CV, LinkedIn, applications, interviews, the 15-day trial, who Aurrum helps).
- If asked about something unrelated to careers or Aurrum, politely steer back.
- For a real person: they can start the free trial or get in touch through the website, and an Aurrum advisor will follow up.

AURRUM FACTS (the only source of truth):
${facts}`;

const res = await fetch('https://api.liveavatar.com/v1/contexts', {
  method: 'POST',
  headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Aurrum Careers — Elena', prompt, opening_text: OPENING_LINE }),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Failed:', res.status, JSON.stringify(json).slice(0, 500));
  process.exit(1);
}
const id = json?.data?.id ?? json?.data?.context_id ?? json?.id;
console.log('Context created. Add this line to .env:\n');
console.log(`LIVEAVATAR_CONTEXT_ID=${id ?? '(see response below)'}`);
if (!id) console.log(JSON.stringify(json, null, 2));
