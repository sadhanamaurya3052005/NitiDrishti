import { CapabilityGrid } from '@/components/site/CapabilityGrid';
import { DataPolicy } from '@/components/site/DataPolicy';
import { FlowStrip } from '@/components/site/FlowStrip';
import { Hero } from '@/components/site/Hero';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { StackStrip } from '@/components/site/StackStrip';
import { WorkspaceGrid } from '@/components/site/WorkspaceGrid';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <FlowStrip />
        <WorkspaceGrid />
        <CapabilityGrid />
        <DataPolicy />
        <StackStrip />
      </main>
      <SiteFooter />
    </>
  );
}
