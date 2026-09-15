import type { Metadata } from 'next';

import { LegalDoc } from '@/components/site/LegalDoc';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return <LegalDoc kind="privacy" />;
}
