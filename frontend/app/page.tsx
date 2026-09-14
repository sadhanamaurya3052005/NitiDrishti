import { AboutSplit } from '@/components/site/AboutSplit';
import { CivicMarquee } from '@/components/site/CivicMarquee';
import { FaqAccordion } from '@/components/site/FaqAccordion';
import { HeroCarousel } from '@/components/site/HeroCarousel';
import { SafetyBadges } from '@/components/site/SafetyBadges';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { StakeholderGateways } from '@/components/site/StakeholderGateways';

export default function HomePage() {
  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-pill focus:bg-saffron focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content">
        <HeroCarousel />
        <StakeholderGateways />
        <CivicMarquee />
        <AboutSplit />
        <SafetyBadges />
        <FaqAccordion />
      </main>
      <SiteFooter />
    </>
  );
}
