'use client';

import React, { useState, useEffect, useRef } from 'react';

const CHARS = '0123456789ABCDEF$#@%&*<>~';

interface DecodeTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
}

export default function DecodeText({
  text,
  className = '',
  as: Component = 'span',
}: DecodeTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayText(text);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          let iteration = 0;
          const maxIterations = text.length;

          const interval = setInterval(() => {
            setDisplayText((_) =>
              text
                .split('')
                .map((char, index) => {
                  if (char === ' ' || char === '\n') return char;
                  if (index < iteration) {
                    return text[index];
                  }
                  return CHARS[Math.floor(Math.random() * CHARS.length)];
                })
                .join('')
            );

            if (iteration >= maxIterations) {
              clearInterval(interval);
              setDisplayText(text);
            }

            iteration += 1 / 2;
          }, 30);
        }
      },
      { threshold: 0.2 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [text, hasAnimated]);

  return (
    // @ts-expect-error dynamic component type
    <Component ref={elementRef} className={className}>
      {displayText}
    </Component>
  );
}
