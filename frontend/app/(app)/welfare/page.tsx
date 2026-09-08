import type { Metadata } from 'next';

import { WorkspaceIntro } from '@/components/app/WorkspaceIntro';

export const metadata: Metadata = { title: 'Welfare Officer' };

export default function WelfareWorkspacePage() {
  return <WorkspaceIntro id="officer" />;
}
