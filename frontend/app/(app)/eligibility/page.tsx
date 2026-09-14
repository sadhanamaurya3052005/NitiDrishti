import type { Metadata } from 'next';

import { EligibilityDesk } from '@/components/app/EligibilityDesk';

export const metadata: Metadata = { title: 'Eligibility' };

export default function EligibilityPage() {
  return <EligibilityDesk />;
}
