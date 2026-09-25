import { useEffect, useRef, useState } from 'react';
import { useSmoothScroll } from './animations/useSmoothScroll.js';
import { useActiveScene } from './animations/useActiveScene.js';
import { useReveal } from './animations/useReveal.js';
import CompanionStage from './components/CompanionStage.jsx';
import ScenePanel from './components/ScenePanel.jsx';
import IntroGate from './components/IntroGate.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { scenes, personas } from './data/scenes.js';

const sceneIds = scenes.map((s) => s.id);

function FlowList({ items }) {
  return (
    <ol className="flow-list">
      {items.map((item, i) => (
        <li key={item} data-reveal>
          <span>{item}</span>
          {i < items.length - 1 && <span className="flow-arrow" aria-hidden="true">↓</span>}
        </li>
      ))}
    </ol>
  );
}

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const [persona, setPersona] = useState(null);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [paused, setPaused] = useState(false);
  // Always start light (warm paper/plaster background), regardless of the
  // visitor's OS color-scheme preference — matches the reference screenshot.
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useSmoothScroll();
  const trackRef = useRef(null);
  const activeSceneId = useActiveScene(trackRef, sceneIds);
  const [overrideText, setOverrideText] = useState(null);
  const [activePersonaPick, setActivePersonaPick] = useState(persona);

  useReveal(trackRef, []);

  const handleIntroDone = (personaId) => {
    setPersona(personaId);
    setActivePersonaPick(personaId);
    setIntroDone(true);
  };

  const handlePersonaClick = (p) => {
    setActivePersonaPick(p.id);
    setOverrideText(p.reply);
  };

  return (
    <div className={`companion-app ${reducedMotion ? 'motion-reduced' : ''}`}>
      {!introDone && <IntroGate onDone={handleIntroDone} />}

      <a className="skip-link" href="#who">Skip introduction</a>

      <header className="mini-header" hidden={!introDone}>
        <a href="#welcome" className="logo-chip" aria-label="Aurrum Careers home">
          <img src="/brand/aurrum-logo-light.webp" alt="Aurrum Careers" className="logo-chip__img logo-chip__img--light" />
          <img src="/brand/aurrum-logo-dark.webp" alt="Aurrum Careers" className="logo-chip__img logo-chip__img--dark" />
        </a>
        <div className="mini-header__actions">
          <ThemeToggle theme={theme} onToggle={setTheme} />
          <a href="#final" className="btn btn--ghost">
            <span className="label-full">Skip to Free Trial</span>
            <span className="label-short">Free Trial</span>
          </a>
        </div>
      </header>

      <div className={`story ${introDone ? 'is-visible' : 'is-hidden'}`} ref={trackRef}>
        <div className="story__avatar-col">
          {introDone && <CompanionStage
            activeSceneId={activeSceneId}
            overrideText={overrideText}
            onOverrideConsumed={() => setOverrideText(null)}
            muted={muted} onToggleMute={() => setMuted((m) => !m)}
            captionsOn={captionsOn} onToggleCaptions={() => setCaptionsOn((c) => !c)}
            reducedMotion={reducedMotion} onToggleReducedMotion={() => setReducedMotion((r) => !r)}
            paused={paused} onTogglePaused={() => setPaused((p) => !p)}
          />}
        </div>

        <div className="story__track">
          <ScenePanel id="welcome" eyebrow="Your career advisor" motif="stars">
            <h1>Meet Elena, the advisor who explains Aurrum Careers for you.</h1>
            <p className="lede">Scroll — I'll walk you through it, or ask me anything.</p>
          </ScenePanel>

          <ScenePanel id="problem" eyebrow="The problem" motif="laptop">
            <h2>Job hunting shouldn't feel like this.</h2>
            <FlowList items={['100 Applications', 'No Response', 'Confusion', 'Wrong Roles', 'Interview Anxiety']} />
          </ScenePanel>

          <ScenePanel id="solution" eyebrow="The Aurrum solution" motif="compass">
            <h2>Direction, brand, fit, strategy, preparation, growth.</h2>
            <p>Everything your career search needs, brought together in one guided experience.</p>
          </ScenePanel>

          <ScenePanel id="who" eyebrow="Who we help" motif="network">
            <h2>Which one sounds most like you?</h2>
            <div className="persona-picker" data-reveal>
              {personas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`segment-pill ${activePersonaPick === p.id ? 'is-active' : ''}`}
                  onClick={() => handlePersonaClick(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </ScenePanel>

          <ScenePanel id="cv" eyebrow="Your CV" motif="cv">
            <h2>Your CV should say why, not just what.</h2>
            <p>We rewrite it to meet UK hiring standards and pass ATS — so it makes the case for you.</p>
          </ScenePanel>

          <ScenePanel id="applications" eyebrow="Applications" motif="jobcards">
            <h2>Quality over volume.</h2>
            <FlowList items={['100 Random Jobs', 'Filtered by Fit', '10 Real Opportunities']} />
          </ScenePanel>

          <ScenePanel id="linkedin" eyebrow="LinkedIn" motif="linkedin">
            <h2>Your profile should say what your CV says.</h2>
            <p>Headline, about, experience, skills, positioning — aligned and visible to recruiters.</p>
          </ScenePanel>

          <ScenePanel id="interview" eyebrow="Interviews" motif="mic">
            <h2>Own the interview.</h2>
            <FlowList items={['Real Questions', 'Honest Feedback', 'Real Practice', 'Real Confidence']} />
          </ScenePanel>

          <ScenePanel id="journey" eyebrow="Your journey" motif="ladder">
            <h2>Six steps, not six hundred job tabs.</h2>
            <FlowList items={['Know Your Direction', 'Build Your Brand', 'Find Your Fit', 'Make Your Move', 'Own the Interview', 'Land & Level Up']} />
          </ScenePanel>

          <ScenePanel id="trial" eyebrow="15-day free trial" motif="calendar">
            <h2>Try it before deciding what comes next.</h2>
            <FlowList items={['Day 1 — Understand You', 'Day 2–5 — Build Positioning', 'Day 5–10 — Applications & Strategy', 'Day 10–15 — Interview & Next Steps']} />
          </ScenePanel>

          <ScenePanel id="final" eyebrow="Ready?" motif="target">
            <h2>It's not about what Aurrum can do.</h2>
            <p>It's about where you want your career to go.</p>
            <div className="final-ctas" data-reveal>
              <a href="#final" className="btn btn--primary">Start My 15-Day Free Trial</a>
              <a href="#welcome" className="btn btn--outline">Talk to Elena</a>
            </div>
          </ScenePanel>
        </div>
      </div>

      <footer className="site-footer">
        <a href="#welcome" className="logo-chip logo-chip--footer" aria-label="Aurrum Careers home">
          <img src="/brand/aurrum-logo-light.webp" alt="Aurrum Careers" className="logo-chip__img logo-chip__img--light" />
          <img src="/brand/aurrum-logo-dark.webp" alt="Aurrum Careers" className="logo-chip__img logo-chip__img--dark" />
        </a>
        <p className="site-footer__copy">© {new Date().getFullYear()} Aurrum Careers. All rights reserved.</p>
      </footer>
    </div>
  );
}
