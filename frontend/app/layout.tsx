import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';

import { SplashProvider } from '@/components/brand/SplashProvider';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { APP, SPLASH_SESSION_KEY } from '@/lib/config';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-devanagari',
});

export const metadata: Metadata = {
  title: {
    default: `${APP.name} — ${APP.tagline}`,
    template: `%s · ${APP.name}`,
  },
  description:
    'NitiDrishti collects government schemes, scholarships, jobs, internships and policy documents from official sources, understands them with AI, and shows each citizen what they qualify for — with the reason and the source.',
  applicationName: APP.name,
  keywords: [
    'government schemes',
    'scholarships',
    'eligibility',
    'policy intelligence',
    'welfare analytics',
  ],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  width: 'device-width',
  initialScale: 1,
};

/** Hides the splash before first paint when it has already played this session. */
const splashGuard = `(function(){try{if(sessionStorage.getItem('${SPLASH_SESSION_KEY}')==='1'){document.documentElement.classList.add('nd-splash-seen');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink">
        <script dangerouslySetInnerHTML={{ __html: splashGuard }} />
        <LocaleProvider>
          <SplashProvider>{children}</SplashProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
