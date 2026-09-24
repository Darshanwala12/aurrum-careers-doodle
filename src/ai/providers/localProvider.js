import { knowledge, FALLBACK } from '../knowledge.js';

/**
 * Local retrieval provider — works with zero credentials.
 *
 * Scores every knowledge entry against the question (phrase hits weighted by
 * length, so "cover letter" beats "letter"), and uses conversation history to
 * resolve vague follow-ups ("tell me more", "and that?") to the last topic.
 * Never generates text: it only ever returns approved knowledge answers.
 */
// Whole-utterance only: "how?" is a follow-up, "how much does it cost" is not.
const FOLLOWUP_RE = /^(tell me more|more|go on|and|what else|explain (that|more)|how|why|really|ok(ay)?|then what)[\s.!?]*$/i;

function score(entry, q) {
  let s = 0;
  for (const kw of entry.keywords) {
    // Word-boundary match so "hi" doesn't fire inside "this"; allows plurals
    // ("interviews" still matches "interview").
    const re = new RegExp(`(^|[^a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(e?s)?([^a-z]|$)`, 'i');
    if (re.test(q)) s += kw.length;
  }
  return s;
}

export function createLocalProvider() {
  return {
    name: 'local',
    async respond({ text, history }) {
      const q = text.toLowerCase().trim();
      const lastTopic = [...history].reverse().find((m) => m.role === 'assistant' && m.topic && m.topic !== 'fallback')?.topic;

      if (FOLLOWUP_RE.test(q) && lastTopic) {
        const prev = knowledge.find((k) => k.id === lastTopic);
        const next = prev?.followups?.[0];
        const nextEntry = next && best(next.toLowerCase());
        if (nextEntry) return nextEntry;
      }
      return best(q) ?? FALLBACK;
    },
  };
}

/** Best-matching knowledge entry for a sentence (or null). Used to pick the
 *  doodle object + page section for live-avatar conversations too. */
export function findTopic(text) {
  return best(String(text).toLowerCase());
}

function best(q) {
  let top = null;
  let topScore = 0;
  for (const entry of knowledge) {
    const s = score(entry, q);
    if (s > topScore) { top = entry; topScore = s; }
  }
  return top;
}
