import Link from 'next/link';

import { BrandingLogo } from '@/components/brand/BrandingLogo';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandingLogo size={72} animated={false} glow />
      <p className="nd-eyebrow mt-8">404</p>
      <h1 className="mt-3 text-headline">This page is not part of the platform</h1>
      <p className="nd-lede mt-3 max-w-md">
        The address you opened does not exist. Nothing was lost — return to the entry screen and
        continue from there.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-pill bg-ink px-5 py-3 text-sm font-semibold text-canvas transition-transform duration-300 ease-civic hover:-translate-y-0.5"
      >
        Back to NitiDrishti
      </Link>
    </main>
  );
}
