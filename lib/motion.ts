/**
 * SentinelAPI Global Motion System
 * 
 * Strict cyber SOC motion guidelines:
 * - Durations: 200ms to 600ms
 * - Precise technical easing: cubic-bezier(0.22, 1, 0.36, 1)
 * - Stagger: 60ms to 80ms
 * - Animate only transform and opacity for maximum 60fps performance
 * - Global toggle to disable or tone down effects cleanly
 */

import type { Variants, Transition } from 'framer-motion';

/**
 * Global Motion Configuration
 * Can be altered via site config or user preferences
 */
export const MOTION_CONFIG = {
  enabled: true,
  // When true, all variants immediately resolve to their visible end states without transition
  respectReducedMotion: true,
  defaultDuration: 0.35,
  fastDuration: 0.22,
  slowDuration: 0.55,
  defaultStagger: 0.07,
  // Technical cyber ease-out curve
  ease: [0.22, 1, 0.36, 1] as const,
};

export const cyberEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const defaultTransition: Transition = {
  duration: MOTION_CONFIG.defaultDuration,
  ease: cyberEase,
};

export const fastTransition: Transition = {
  duration: MOTION_CONFIG.fastDuration,
  ease: cyberEase,
};

export const slowTransition: Transition = {
  duration: MOTION_CONFIG.slowDuration,
  ease: cyberEase,
};

/**
 * Page Transitions (app/template.tsx)
 * Subtle fade + 12px upward slide under 300ms
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: cyberEase,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.18,
      ease: cyberEase,
    },
  },
};

/**
 * Technical Fade & Upward Rise (whileInView, once: true)
 */
export const fadeUpVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_CONFIG.defaultDuration,
      ease: cyberEase,
    },
  },
};

/**
 * Technical Fade In
 */
export const fadeInVariant: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: MOTION_CONFIG.defaultDuration,
      ease: cyberEase,
    },
  },
};

/**
 * Technical Scale In (for modals, badges, cards)
 */
export const scaleInVariant: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_CONFIG.fastDuration,
      ease: cyberEase,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: {
      duration: 0.15,
      ease: cyberEase,
    },
  },
};

/**
 * Stagger Container for lists of telemetry cards, steps, or findings
 */
export const createStaggerContainer = (staggerChildren = MOTION_CONFIG.defaultStagger, delayChildren = 0): Variants => ({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerContainer = createStaggerContainer();

/**
 * HUD Bracket expansion on card hover
 */
export const hudBracketVariants: Variants = {
  rest: {
    opacity: 0.35,
    scale: 1,
  },
  hover: {
    opacity: 1,
    scale: 1.05,
    transition: {
      duration: 0.18,
      ease: cyberEase,
    },
  },
};

/**
 * Scanline sweep animation keyframes helper for Tailwind or style
 */
export const scanlineKeyframes = {
  from: { transform: 'translateY(-100%)' },
  to: { transform: 'translateY(1000%)' },
};
