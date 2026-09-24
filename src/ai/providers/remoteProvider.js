import { knowledge, FALLBACK } from '../knowledge.js';

/**
 * Remote LLM provider — connects the character to a real model through YOUR
 * backend. API keys must never ship in this bundle, so the browser only talks
 * to a server endpoint you own (set VITE_AURRUM_AI_ENDPOINT).
 *
 * Request  POST { messages: [{role, content}], knowledge: [{id, answer}] }
 * Response 200  { text: string, topic?: string }
 *
 * The backend should call the LLM with the knowledge as grounding and return
 * `topic` = the knowledge id it relied on; the UI uses that to pick the
 * doodle-world object and highlight the matching page section.
 */
export function createRemoteProvider(endpoint, fallback) {
  const grounding = knowledge.map(({ id, answer, section }) => ({ id, answer, section }));

  return {
    name: 'remote',
    async respond({ text, history, signal }) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            messages: [...history.map((m) => ({ role: m.role, content: m.text })), { role: 'user', content: text }],
            knowledge: grounding,
          }),
        });
        if (!res.ok) throw new Error(`AI endpoint ${res.status}`);
        const data = await res.json();
        const entry = knowledge.find((k) => k.id === data.topic) ?? FALLBACK;
        return { ...entry, id: data.topic ?? entry.id, answer: data.text || entry.answer };
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        // Network/backend failure: answer from approved content instead of going silent.
        return fallback.respond({ text, history });
      }
    },
  };
}
