import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CitizenDesk } from '@/components/app/CitizenDesk';

export const metadata: Metadata = { title: 'Citizen & Nyaya-Mitra' };

export default function CitizenWorkspacePage() {
  return (
    <Suspense fallback={<div className="nd-skeleton h-64 w-full" />}>
      <CitizenDesk />
    </Suspense>
  );
}
