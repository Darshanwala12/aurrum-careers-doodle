import { useRef } from 'react';
import gsap from 'gsap';

/**
 * Dark-mode switch with an animated radial wipe instead of an instant CSS
 * swap: an overlay painted with the OLD theme's background sits on top,
 * the new theme is applied underneath immediately, then the overlay's
 * circular clip-path collapses toward the click point, revealing it.
 */
export default function ThemeToggle({ theme, onToggle }) {
  const btnRef = useRef(null);

  const handleClick = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    if (reduced || !btnRef.current) {
      onToggle(nextTheme);
      return;
    }

    const rect = btnRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const overlay = document.createElement('div');
    overlay.className = 'theme-wipe';
    overlay.dataset.theme = theme; // paint it with the OUTGOING theme's background
    document.body.appendChild(overlay);

    // Apply the new theme immediately underneath the overlay.
    onToggle(nextTheme);

    gsap.fromTo(
      overlay,
      { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
      {
        clipPath: `circle(0px at ${x}px ${y}px)`,
        duration: 0.7,
        ease: 'power3.inOut',
        onComplete: () => overlay.remove(),
      }
    );
  };

  return (
    <button
      ref={btnRef}
      type="button"
      className="theme-toggle"
      onClick={handleClick}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}
