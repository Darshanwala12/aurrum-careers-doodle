import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let activeLenis = null;

export function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // autoRaf:false is required — Lenis 1.3.x auto-starts its own rAF loop
    // by default, and driving it a second time via gsap.ticker causes
    // runaway scroll momentum (confirmed while building the previous site).
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    activeLenis = lenis;

    const update = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      activeLenis = null;
    };
  }, []);
}

// Used by the left editorial nav to jump directly to a scene (brief:
// "smoothly transition/jump directly to that exact scene"). Native smooth
// scroll rather than Lenis.scrollTo — the latter stalls when it has to
// merge with in-flight wheel momentum from the visitor's last scroll.
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
