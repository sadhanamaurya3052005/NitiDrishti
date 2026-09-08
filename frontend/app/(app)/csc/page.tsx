import type { Metadata } from 'next';

import { WorkspaceIntro } from '@/components/app/WorkspaceIntro';

export const metadata: Metadata = { title: 'CSC / Kiosk Desk' };

export default function CscWorkspacePage() {
  return <WorkspaceIntro id="csc" />;
}
