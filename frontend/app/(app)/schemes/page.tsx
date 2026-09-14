import type { Metadata } from 'next';

import { SchemeDirectory } from '@/components/site/SchemeDirectory';

export const metadata: Metadata = { title: 'Schemes' };

export default function SchemesPage() {
  return <SchemeDirectory embedded />;
}
