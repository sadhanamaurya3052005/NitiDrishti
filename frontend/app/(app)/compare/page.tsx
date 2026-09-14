import type { Metadata } from 'next';

import { CompareDesk } from '@/components/app/CompareDesk';

export const metadata: Metadata = { title: 'Compare' };

export default function ComparePage() {
  return <CompareDesk />;
}
