import type { Metadata } from 'next';

import { WorkspaceIntro } from '@/components/app/WorkspaceIntro';

export const metadata: Metadata = { title: 'Citizen & Student' };

export default function CitizenWorkspacePage() {
  return <WorkspaceIntro id="citizen" />;
}
