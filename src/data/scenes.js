import { STATES } from './states.js';

// One continuous scroll story (brief §8, §30). `motif` names a small doodle
// world object rendered beside the character for that beat (brief §15).
export const scenes = [
  {
    id: 'welcome',
    label: 'Welcome',
    state: STATES.GREETING,
    motif: 'stars',
    text: "Hi. I'm Elena. You could spend the next hour scrolling through job boards, or you could spend five minutes with me and actually get somewhere. Which do you want?",
  },
  {
    id: 'problem',
    label: 'The Problem',
    navIndex: '01',
    state: STATES.EMPATHETIC,
    motif: 'laptop',
    text: "This isn't a bad CV. It's an undersold one. A hundred applications, no response, confusion, wrong roles, interview anxiety — that's not a you problem, that's a fit problem.",
  },
  {
    id: 'solution',
    label: 'The Solution',
    navIndex: '02',
    state: STATES.CONFIDENT,
    motif: 'compass',
    text: "Direction first. Everything else — your CV, your applications, your interview prep — follows from that. Skip the first step and the rest just gets louder, not better.",
  },
  {
    id: 'who',
    label: 'Who We Help',
    navIndex: '03',
    state: STATES.CURIOUS,
    motif: 'network',
    text: "Student, graduate, mid-career, changing lanes entirely — doesn't matter. Tell me where you are and I'll tell you exactly what changes.",
  },
  {
    id: 'cv',
    label: 'Your CV',
    navIndex: '04',
    state: STATES.POINTING_LEFT,
    motif: 'cv',
    text: "Your CV's job isn't to list what you did. It's to make the case for why you're right for this. Most CVs never make that case.",
  },
  {
    id: 'applications',
    label: 'Applications',
    navIndex: '05',
    state: STATES.EXPLAINING,
    motif: 'jobcards',
    text: "Ten well-aimed applications beat a hundred generic ones. I'd rather you apply less and mean it more.",
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    navIndex: '06',
    state: STATES.POINTING_RIGHT,
    motif: 'linkedin',
    text: "Your LinkedIn and your CV are currently telling two different stories. Recruiters notice that before they notice anything else.",
  },
  {
    id: 'interview',
    label: 'Interviews',
    navIndex: '07',
    state: STATES.ENCOURAGING,
    motif: 'mic',
    text: "Nerves aren't the problem. Not knowing what you're walking into is the problem. We fix the second thing, and the first one takes care of itself.",
  },
  {
    id: 'journey',
    label: 'Your Journey',
    navIndex: '08',
    state: STATES.POINTING_UP,
    motif: 'ladder',
    text: "Landing the role isn't the finish line. It's page one of the next chapter — six steps to get there, not six hundred job tabs.",
  },
  {
    id: 'trial',
    label: '15-Day Trial',
    navIndex: '09',
    state: STATES.HAPPY,
    motif: 'calendar',
    text: "Fifteen days. No card tricks, no guaranteed-job nonsense. Try it, see if it's useful, decide from there.",
  },
  {
    id: 'final',
    label: 'Start',
    state: STATES.CELEBRATING,
    motif: 'target',
    text: "So now you know what we do. But the important question isn't what Aurrum can do — it's where you want your career to go.",
  },
];

// The 9-item editorial left nav (brief: fixed vertical nav, desktop only).
export const navScenes = scenes.filter((s) => s.navIndex);

export const personas = [
  { id: 'student', label: 'Student', reply: "Good — let's start with the basics: a CV that stands out, and a clear first step into internships or graduate roles." },
  { id: 'graduate', label: 'Fresh Graduate', reply: "Your degree gets you in the room. Let's make sure your profile gets you noticed before you're even in it." },
  { id: 'working', label: 'Working Professional', reply: "Then it's about growth — let's find roles that actually move you forward, not sideways." },
  { id: 'job-changer', label: 'Changing Jobs', reply: "Let's position you clearly, target the right roles, and apply with intent instead of volume." },
  { id: 'career-changer', label: 'Changing Career', reply: "Then your biggest challenge isn't finding another job — it's showing employers how your experience transfers into your new direction." },
  { id: 'passive', label: 'Passive Job Seeker', reply: "That's the best position to search from. We'll only bring you opportunities actually worth leaving for." },
  { id: 'unsure', label: 'Not Sure Yet', reply: "That's completely fine — that's exactly where career counselling starts: understanding your direction before anything else." },
];

// Smart question chips (brief §20) — each maps to a knowledge-base entry.
export const suggestedQuestions = [
  { q: 'How does it work?', k: 'how-it-works' },
  { q: 'Who is this for?', k: 'who' },
  { q: 'Can you help with my CV?', k: 'cv' },
  { q: 'Can you help with LinkedIn?', k: 'linkedin' },
  { q: "What if I'm changing careers?", k: 'career-changer' },
  { q: 'How does the free trial work?', k: 'trial' },
  { q: 'Can I talk to a human?', k: 'human' },
];

// Structured knowledge base (brief §18). Answers only from this approved
// content — no invented guarantees. Keys are matched by `useVoiceMode`.
export const knowledgeBase = [
  { id: 'overview', k: ['what is aurrum', 'what does aurrum', 'who is aurrum', 'who are you', 'your name'], a: "I'm Elena, your Aurrum Careers advisor. Aurrum brings direction, your professional brand, job matching, applications, interview preparation and career growth into one guided experience." },
  { id: 'who', k: ['who is this for', 'who do you help', 'who'], a: 'Students, fresh graduates, early-career professionals, job changers, career changers, and passive job seekers — anyone who wants real direction instead of guesswork.' },
  { id: 'how-it-works', k: ['how does it work', 'how it works'], a: "We start by understanding your direction, then build your professional brand, match you to roles that fit, help you apply strategically, prepare you for interviews, and support your growth afterwards." },
  { id: 'cv', k: ['cv', 'resume', 'cover letter'], a: "We rewrite your CV and cover letter to meet UK hiring standards and pass ATS systems — so it makes clear why you're right for the role, not just what you've done." },
  { id: 'linkedin', k: ['linkedin'], a: 'We rebuild your LinkedIn headline, about section, experience and skills so your profile is visible to recruiters and says the same thing your CV does.' },
  { id: 'applications', k: ['applications', 'job applications'], a: "We focus on quality, well-matched applications rather than sending the same CV to hundreds of roles." },
  { id: 'interview', k: ['interview'], a: 'We run structured mock interviews with honest feedback, so you walk in prepared and confident.' },
  { id: 'counselling', k: ['counselling', 'counseling', 'career advice'], a: "One-to-one career counselling helps you decide on direction, sector and long-term progression before anything else." },
  { id: 'student', k: ['student', "i'm a student", 'i am a student'], a: "If you're a student, we help with internships, graduate programmes and entry-level roles — starting with a CV that stands out." },
  { id: 'career-changer', k: ['career change', 'changing career', 'change career'], a: "For a career change, we focus on your transferable skills and help you tell a credible transition story to employers." },
  { id: 'trial', k: ['trial', '15', 'free trial', '15-day'], a: 'The 15-day free trial gives you full access to the support — no invented guarantees, just try it and see the difference for yourself.' },
  { id: 'human', k: ['human', 'real person', 'talk to someone', 'contact'], a: "Of course — you can reach the Aurrum Careers team directly through the contact page, and a real advisor will follow up with you." },
];

export const FALLBACK_ANSWER =
  "I don't have an approved answer for that yet — try asking about the CV, LinkedIn, interviews, the free trial, or who Aurrum Careers helps.";
