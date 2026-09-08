import type { Metadata } from 'next';

import { WorkspaceIntro } from '@/components/app/WorkspaceIntro';

export const metadata: Metadata = { title: 'Nyay-Mitra' };

export default function NyayMitraWorkspacePage() {
  return <WorkspaceIntro id="nyaymitra" />;
}
