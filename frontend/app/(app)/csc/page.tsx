import type { Metadata } from 'next';

import { CscIntake } from '@/components/app/CscIntake';

export const metadata: Metadata = { title: 'CSC / Kiosk Desk' };

export default function CscWorkspacePage() {
  return <CscIntake />;
}
