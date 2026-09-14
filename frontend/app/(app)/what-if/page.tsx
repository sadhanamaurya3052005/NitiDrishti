import type { Metadata } from 'next';

import { WhatIfDesk } from '@/components/app/WhatIfDesk';

export const metadata: Metadata = { title: 'What-If' };

export default function WhatIfPage() {
  return <WhatIfDesk />;
}
