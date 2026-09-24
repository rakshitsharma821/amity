'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pageTransitionVariants, MOTION_CONFIG } from '@/lib/motion';

export default function Template({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  if (!MOTION_CONFIG.enabled || shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex flex-col w-full min-h-[calc(100vh-4.5rem)]"
    >
      {children}
    </motion.div>
  );
}
