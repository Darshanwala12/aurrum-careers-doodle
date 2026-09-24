import { useEffect, useRef, useState } from 'react';

// Reports whichever [data-scene-id] element sits closest to viewport centre
// as the active scene — keeps the character's dialogue/state in sync with
// what the visitor is actually scrolled to (brief §30).
export function useActiveScene(rootRef, sceneIds) {
  const [activeId, setActiveId] = useState(sceneIds[0]);
  const ratios = useRef(new Map());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('[data-scene-id]');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.current.set(entry.target.dataset.sceneId, entry.intersectionRatio);
        });
        let best = null;
        let bestRatio = 0;
        ratios.current.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (best) setActiveId(best);
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20), rootMargin: '-10% 0px -10% 0px' }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef, sceneIds]);

  return activeId;
}
