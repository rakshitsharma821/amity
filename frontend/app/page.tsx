'use client';

import React, { useState } from 'react';
import ScrollExperience from '@/components/canvas/scroll-experience';
import BootSequence from '@/components/cyber/boot-sequence';
import HeroSection from '@/components/hero/hero-section';
import ProblemSection from '@/components/home/problem-section';
import ThreatCardsSection from '@/components/home/threat-cards-section';
import HowItWorksSection from '@/components/home/how-it-works-section';
import ExampleFindingSection from '@/components/home/example-finding-section';
import FaqSection from '@/components/home/faq-section';
import CtaSection from '@/components/home/cta-section';

export default function HomePage() {
  const [bootCompleted, setBootCompleted] = useState(false);

  return (
    <div className="relative min-h-screen bg-obsidian text-obsidian-heading overflow-x-hidden">
      {/* 2-second boot sequence intro (once per session, skippable) */}
      <BootSequence onComplete={() => setBootCompleted(true)} />

      {/* Persistent, fixed 3D canvas driven by native scroll progress along CatmullRom curve */}
      <ScrollExperience />

      {/* Real HTML Storytelling Content with Native Browser Scrolling */}
      <div className="relative z-10 flex flex-col">
        <HeroSection />
        <ProblemSection />
        <ThreatCardsSection />
        <HowItWorksSection />
        <ExampleFindingSection />
        <FaqSection />
        <CtaSection />
      </div>
    </div>
  );
}
