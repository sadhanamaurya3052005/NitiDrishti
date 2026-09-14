import type { Metadata } from 'next';

import { NyayMitraDesk } from '@/components/app/NyayMitraDesk';

export const metadata: Metadata = { title: 'Nyay-Mitra' };

export default function NyayMitraPage() {
  return <NyayMitraDesk />;
}
