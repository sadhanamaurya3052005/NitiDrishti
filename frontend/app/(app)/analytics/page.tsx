import type { Metadata } from 'next';

import { WorkspaceIntro } from '@/components/app/WorkspaceIntro';

export const metadata: Metadata = { title: 'District Analytics' };

export default function AnalyticsWorkspacePage() {
  return <WorkspaceIntro id="analytics" />;
}
