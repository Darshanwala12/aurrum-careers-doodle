import { STATES } from '../data/states.js';

/**
 * Aurrum AI knowledge layer — the single source the character answers from.
 *
 * Every answer is written only from content already on the site (scene copy,
 * personas, flow lists). Anything the site doesn't publish (pricing, direct
 * contact details) is answered honestly as "the team will confirm" rather
 * than invented.
 *
 * Fields:
 *   id        stable topic id (also sent to a remote LLM as context)
 *   keywords  phrases scored by the local retriever (longer = stronger)
 *   answer    what the character says
 *   section   existing page section id to softly highlight (optional)
 *   world     doodle-world object to draw beside the character (optional)
 *   note      handwritten annotation shown on that object (optional)
 *   state     character pose while explaining
 *   followups suggested next questions
 */
export const knowledge = [
  {
    id: 'overview',
    keywords: ['what does aurrum', 'what is aurrum', 'what do you do', 'aurrum do', 'help me with', 'what can aurrum', 'about aurrum', 'who are you', 'your name'],
    answer: "I'm Elena, your Aurrum career companion. Aurrum brings everything a career search needs into one guided experience — knowing your direction, building your brand, finding roles that fit, applying with strategy, owning the interview, and growing after you land.",
    section: 'solution', world: 'compass', note: 'direction first', state: STATES.CONFIDENT,
    followups: ['Explain all your services', 'Who is Aurrum for?', 'How does the 15-day trial work?'],
  },
  {
    id: 'services',
    keywords: ['services', 'all your services', 'everything you offer', 'what do you offer', 'explain all', 'offer'],
    answer: "Absolutely. Aurrum supports you across the whole journey — career counselling for direction, a CV and cover letter rewritten to UK hiring standards, a LinkedIn profile aligned with your CV, targeted job applications, mock interviews with honest feedback, and support to grow once you land.",
    section: 'solution', world: 'roadmap', note: 'one guided journey', state: STATES.EXPLAINING,
    followups: ['Can you help improve my CV?', 'Do you help with interviews?', 'Explain the whole Aurrum journey'],
  },
  {
    id: 'problem',
    keywords: ['no response', 'no replies', 'rejected', 'not hearing back', 'applied everywhere', 'frustrated', 'stuck'],
    answer: "That's so common — a hundred applications, no response, the wrong roles, interview nerves. It's rarely a you problem. It's a fit and positioning problem, and that's exactly what we fix.",
    section: 'problem', world: 'jobs', note: 'fit, not volume', state: STATES.EMPATHETIC,
    followups: ['How do you pick the right roles?', 'Can you help improve my CV?'],
  },
  {
    id: 'cv',
    keywords: ['cv', 'resume', 'résumé', 'improve my cv', 'ats'],
    answer: "Yes. We rewrite your CV to meet UK hiring standards and pass ATS systems — so it doesn't just list what you did, it makes the case for why you're right for the role.",
    section: 'cv', world: 'cv', note: 'ATS + recruiter focused', state: STATES.POINTING_RIGHT,
    followups: ['What about cover letters?', 'Can you help with LinkedIn?'],
  },
  {
    id: 'cover-letter',
    keywords: ['cover letter', 'covering letter'],
    answer: "Cover letters come alongside your CV. We write them to tell the same story — clear, specific to the role, and focused on why you fit, not a generic template.",
    section: 'cv', world: 'cv', note: 'same story, role-specific', state: STATES.EXPLAINING,
    followups: ['Can you help find jobs?', 'Do you help with interviews?'],
  },
  {
    id: 'linkedin',
    keywords: ['linkedin', 'profile', 'recruiters find me', 'headline'],
    answer: "We rebuild your LinkedIn headline, about section, experience and skills so your profile is visible to recruiters — and says the same thing your CV does. Mismatched stories are the first thing recruiters notice.",
    section: 'linkedin', world: 'linkedin', note: 'aligned with your CV', state: STATES.POINTING_RIGHT,
    followups: ['Can you help find jobs?', 'Do you help with networking?'],
  },
  {
    id: 'applications',
    keywords: ['find jobs', 'find me a job', 'job search', 'applications', 'apply', 'which jobs', 'right roles', 'pick the right'],
    answer: "Quality over volume. We filter a hundred random listings down to the roles that genuinely fit you, then apply with strategy — ten well-aimed applications beat a hundred generic ones.",
    section: 'applications', world: 'jobs', note: '100 → 10 real fits', state: STATES.EXPLAINING,
    followups: ['What is your job-search strategy?', 'Do you help with interviews?'],
  },
  {
    id: 'strategy',
    keywords: ['strategy', 'job-search strategy', 'plan', 'where to start', 'start'],
    answer: "Strategy starts with direction. Once we know where you're heading, we position your CV and LinkedIn for it, target the roles that fit, and pace your applications so every one is intentional.",
    section: 'journey', world: 'target', note: 'aim, then apply', state: STATES.CONFIDENT,
    followups: ['Explain the whole Aurrum journey', 'How does the 15-day trial work?'],
  },
  {
    id: 'interview',
    keywords: ['interview', 'mock interview', 'nervous', 'anxiety', 'prepare'],
    answer: "Yes — we run structured mock interviews with real questions and honest feedback. Nerves aren't really the problem; not knowing what you're walking into is. We fix that, and confidence follows.",
    section: 'interview', world: 'interview', note: 'real questions, real feedback', state: STATES.ENCOURAGING,
    followups: ['What happens after I get the job?', 'How does the 15-day trial work?'],
  },
  {
    id: 'counselling',
    keywords: ['counselling', 'counseling', 'career advice', 'direction', 'not sure', 'confused', 'what should i do'],
    answer: "Career counselling is where it all starts — one-to-one conversations to understand your direction, sector and long-term progression before we touch your CV or applications.",
    section: 'solution', world: 'compass', note: 'know your direction', state: STATES.EMPATHETIC,
    followups: ['I want to change careers', 'Explain the whole Aurrum journey'],
  },
  {
    id: 'portfolio',
    keywords: ['portfolio', 'personal brand', 'brand', 'positioning', 'professional positioning'],
    answer: "Your professional brand is how your CV, LinkedIn and any portfolio work together to position you. We make sure they all tell one clear story about where you're going.",
    section: 'linkedin', world: 'linkedin', note: 'one clear story', state: STATES.EXPLAINING,
    followups: ['Can you help improve my CV?', 'Can you help with LinkedIn?'],
  },
  {
    id: 'skills',
    keywords: ['skill gap', 'skills gap', 'skills', 'missing skills', 'upskill'],
    answer: "Part of finding your direction is spotting the gap between where you are and the roles you want. We identify those skill gaps early, so you know what to highlight and what to build.",
    section: 'solution', world: 'roadmap', note: 'close the gap', state: STATES.EXPLAINING,
    followups: ['Explain the whole Aurrum journey', 'I want to change careers'],
  },
  {
    id: 'network',
    keywords: ['network', 'networking', 'connections', 'contacts'],
    answer: "Networking is part of building your brand — a strong, aligned LinkedIn profile makes recruiters and the right connections come to you, instead of you chasing them.",
    section: 'who', world: 'linkedin', note: 'let them find you', state: STATES.EXPLAINING,
    followups: ['Can you help with LinkedIn?', 'Can you help find jobs?'],
  },
  {
    id: 'who',
    keywords: ['who is aurrum for', 'who is this for', 'who do you help', 'is this for me'],
    answer: "Students, fresh graduates, early-career and working professionals, people changing jobs or changing careers entirely, and passive job seekers. Tell me which one is you, and I'll tell you exactly what changes.",
    section: 'who', world: 'target', note: 'tell me where you are', state: STATES.CURIOUS,
    followups: ["I'm a student — where should I start?", 'I want to change careers'],
  },
  {
    id: 'student',
    keywords: ['student', 'university', 'internship', 'placement'],
    answer: "Good — let's start with the basics: a CV that stands out, and a clear first step into internships or graduate roles. We'll figure out your direction first so you're not applying blind.",
    section: 'who', world: 'cv', note: 'first step: a CV that stands out', state: STATES.ENCOURAGING,
    followups: ['Can you help improve my CV?', 'How does the 15-day trial work?'],
  },
  {
    id: 'graduate',
    keywords: ['graduate', 'graduated', 'fresh grad', 'degree', 'first job', 'entry level'],
    answer: "Your degree gets you in the room. We make sure your CV and LinkedIn get you noticed before you're even in it — then target graduate and entry-level roles that actually fit.",
    section: 'who', world: 'linkedin', note: 'get noticed first', state: STATES.ENCOURAGING,
    followups: ['Can you help with LinkedIn?', 'Can you help find jobs?'],
  },
  {
    id: 'professional',
    keywords: ['working professional', 'early career', 'promotion', 'grow', 'next level', 'level up'],
    answer: "Then it's about growth — finding roles that actually move you forward, not sideways, and positioning your experience so it's valued at the next level.",
    section: 'journey', world: 'roadmap', note: 'forward, not sideways', state: STATES.CONFIDENT,
    followups: ['What is your job-search strategy?', 'Do you help with interviews?'],
  },
  {
    id: 'job-changer',
    keywords: ['change jobs', 'changing jobs', 'new job', 'leave my job', 'switch jobs'],
    answer: "Let's position you clearly, target the right roles, and apply with intent instead of volume — so the next move is a real step up.",
    section: 'applications', world: 'jobs', note: 'apply with intent', state: STATES.CONFIDENT,
    followups: ['Can you help improve my CV?', 'Do you help with interviews?'],
  },
  {
    id: 'career-changer',
    keywords: ['change careers', 'changing career', 'career change', 'new industry', 'switch careers', 'transition'],
    answer: "Then your biggest challenge isn't finding another job — it's showing employers how your experience transfers. We focus on your transferable skills and help you tell a credible transition story.",
    section: 'who', world: 'roadmap', note: 'transferable skills', state: STATES.EMPATHETIC,
    followups: ['Tell me about career counselling', 'Can you help improve my CV?'],
  },
  {
    id: 'passive',
    keywords: ['passive', 'not actively looking', 'happy where i am', 'open to offers'],
    answer: "That's the best position to search from. We keep your profile sharp and only bring you opportunities actually worth leaving for.",
    section: 'who', world: 'linkedin', note: 'only worth-it roles', state: STATES.CONFIDENT,
    followups: ['Can you help with LinkedIn?', 'How does the 15-day trial work?'],
  },
  {
    id: 'journey',
    keywords: ['journey', 'process', 'how does it work', 'how it works', 'steps', 'whole aurrum', 'explain the whole'],
    answer: "Six steps, not six hundred job tabs. Know your direction, build your brand, find your fit, make your move, own the interview, then land and level up. Each step builds on the one before.",
    section: 'journey', world: 'roadmap', note: '6 steps', state: STATES.POINTING_UP,
    followups: ['What happens after I sign up?', 'How does the 15-day trial work?'],
  },
  {
    id: 'trial',
    keywords: ['trial', 'free trial', '15-day', '15 day', 'fifteen', 'try it', 'free'],
    answer: "The 15-day free trial runs like this: day one, we understand you. Days two to five, we build your positioning. Days five to ten, applications and strategy. Days ten to fifteen, interviews and next steps. No guaranteed-job promises — just try it and decide.",
    section: 'trial', world: 'calendar', note: 'day 1 → day 15', state: STATES.HAPPY,
    followups: ['What happens after I sign up?', 'How do I start?'],
  },
  {
    id: 'after-signup',
    keywords: ['after i sign up', 'after i join', 'sign up', 'join', 'what happens next', 'what happens after', 'onboarding'],
    answer: "After you join, we start by understanding you — your background, goals and where you want to go. From there we build your positioning, then move into applications, and finally interview prep and next steps.",
    section: 'trial', world: 'calendar', note: 'starts with you', state: STATES.EXPLAINING,
    followups: ['How does the 15-day trial work?', 'How do I start?'],
  },
  {
    id: 'after-job',
    keywords: ['after i get the job', 'after i land', 'once i land', 'long term', 'growth'],
    answer: "Landing the role isn't the finish line — it's page one of the next chapter. The last step of the journey is land and level up: settling in well and planning your growth.",
    section: 'journey', world: 'roadmap', note: 'land & level up', state: STATES.CELEBRATING,
    followups: ['Explain the whole Aurrum journey', 'How do I start?'],
  },
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'cost', 'how much', 'fee', 'pay', 'expensive'],
    answer: "Pricing isn't published on this page, so I won't guess. The best way to find out is to start the 15-day free trial — the team will walk you through the options that fit you.",
    section: 'trial', world: 'calendar', note: 'start free', state: STATES.SERIOUS,
    followups: ['How does the 15-day trial work?', 'Can I talk to a human?'],
  },
  {
    id: 'guarantee',
    keywords: ['guarantee', 'guaranteed', 'promise a job'],
    answer: "Honestly, no one can promise you a job, and we won't. What we promise is direction, a stronger profile, better-targeted applications and real interview preparation.",
    section: 'trial', world: 'target', note: 'honest, not hype', state: STATES.SERIOUS,
    followups: ['How does the 15-day trial work?'],
  },
  {
    id: 'human',
    keywords: ['human', 'real person', 'talk to someone', 'contact', 'email', 'phone', 'call'],
    answer: "Of course. Start the free trial or get in touch through the site, and a real Aurrum advisor will follow up with you personally.",
    section: 'final', world: 'target', note: 'a real advisor follows up', state: STATES.HAPPY,
    followups: ['How does the 15-day trial work?'],
  },
  {
    id: 'start',
    keywords: ['how do i start', 'get started', 'begin', 'ready', 'sign me up'],
    answer: "Brilliant. Hit “Start My 15-Day Free Trial” — it's right at the end of the page. Day one is all about understanding you.",
    section: 'final', world: 'target', note: 'start here', state: STATES.CELEBRATING, success: true,
    followups: ['What happens after I sign up?'],
  },
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    answer: "Hi! You don't need to search through the whole website. Just tell me where you are in your career, and I'll explain what could help you.",
    world: null, state: STATES.GREETING,
    followups: ['What can Aurrum help me with?', "I'm a student — where should I start?"],
  },
  {
    id: 'thanks',
    keywords: ['thank', 'thanks', 'cheers', 'great', 'perfect'],
    answer: "You're very welcome. Whenever you're ready, the 15-day free trial is the easiest next step.",
    world: 'target', state: STATES.HAPPY, success: true,
    followups: ['How does the 15-day trial work?'],
  },
];

export const FALLBACK = {
  id: 'fallback',
  answer: "I don't want to guess on that one. I can explain your CV, LinkedIn, applications, interviews, the 15-day trial, or who Aurrum helps — what would be most useful?",
  world: null,
  state: STATES.EMPATHETIC,
  followups: ['What can Aurrum help me with?', 'Explain all your services'],
};

export const OPENING_LINE =
  "Hi, I'm Elena, your Aurrum career companion. You don't need to search through the whole website — just tell me where you are in your career, and I'll explain what could help you.";

export const SUGGESTED_PROMPTS = [
  'What can Aurrum help me with?',
  'Can you help improve my CV?',
  "I'm a student — where should I start?",
  'How does the 15-day trial work?',
  'Help me prepare for an interview.',
  'Explain the whole Aurrum journey.',
];

export const THINKING_PHRASES = [
  'Thinking…',
  'Understanding your goal…',
  'Finding the right direction…',
  "Here's what I'd suggest…",
];
