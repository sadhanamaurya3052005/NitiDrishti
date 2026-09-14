import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';

import { SplashProvider } from '@/components/brand/SplashProvider';
import { AssistantDock } from '@/components/site/AssistantDock';
import { OfflineToast } from '@/components/site/OfflineToast';
import { A11yProvider } from '@/components/providers/A11yProvider';
import { ExperienceProvider } from '@/components/providers/ExperienceProvider';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { PwaProvider } from '@/components/providers/PwaProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
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
  manifest: '/manifest.webmanifest',
  keywords: [
    'government schemes',
    'scholarships',
    'eligibility',
    'policy intelligence',
    'welfare analytics',
  ],
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F1E8' },
    { media: '(prefers-color-scheme: dark)', color: '#07111C' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const splashGuard = `(function(){try{if(sessionStorage.getItem('${SPLASH_SESSION_KEY}')==='1'){document.documentElement.classList.add('nd-splash-seen');}}catch(e){}})();`;

const swBust = `(function(){try{if(!('serviceWorker'in navigator))return;if(sessionStorage.getItem('nd.sw.cleared')==='1')return;navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}).then(function(){return caches.keys();}).then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k);}));}).then(function(){sessionStorage.setItem('nd.sw.cleared','1');location.reload();}).catch(function(){});}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${devanagari.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas font-sans text-ink">
        <script dangerouslySetInnerHTML={{ __html: splashGuard }} />
        <script dangerouslySetInnerHTML={{ __html: swBust }} />
        <LocaleProvider>
          <ThemeProvider>
            <A11yProvider>
              <ExperienceProvider>
                <PwaProvider>
                  <SplashProvider>
                    {children}
                    <AssistantDock />
                    <OfflineToast />
                  </SplashProvider>
                </PwaProvider>
              </ExperienceProvider>
            </A11yProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
