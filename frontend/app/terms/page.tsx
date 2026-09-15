import type { Metadata } from 'next';

import { LegalDoc } from '@/components/site/LegalDoc';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return <LegalDoc kind="terms" />;
}
