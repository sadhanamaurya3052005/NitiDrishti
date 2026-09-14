import type { Metadata } from 'next';

import { AuthScreen } from '@/components/shared/AuthScreen';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
