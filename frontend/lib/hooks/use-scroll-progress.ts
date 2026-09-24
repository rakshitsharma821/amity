'use client';

import { useState, useEffect } from 'react';

/**
 * useScrollProgress
 * Returns the normalized vertical scroll progress of the window (0 to 1)
 * without hijacking or altering native scroll behavior.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            const current = window.scrollY / totalHeight;
            setProgress(Math.min(Math.max(current, 0), 1));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return progress;
}
