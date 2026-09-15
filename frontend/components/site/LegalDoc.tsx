'use client';

import Link from 'next/link';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { useLocale } from '@/components/providers/LocaleProvider';

interface LegalDocProps {
  kind: 'privacy' | 'terms';
}

const DOCS = {
  privacy: {
    en: {
      title: 'Privacy',
      updated: 'Last updated 2026',
      paragraphs: [
        'NitiDrishti is a civic welfare-intelligence product. This page describes how the public web app treats information — not a claim of government certification.',
        'Guest mode writes zero rows on the server. Eligibility sliders and document checks for guests stay in this browser. We do not display full identity numbers.',
        'Signed-in accounts store only what the backend needs for that session. You can sign out to clear the device session. Statutory erasure follows the product’s profile-purge path once accounts are live.',
        'Scheme text comes from official government sources through our own pipeline. We do not sell personal data or use paid third-party beneficiary APIs.',
        'Questions: hello@nitidrishti.local (product inbox, not a 24×7 helpdesk).',
      ],
    },
    hi: {
      title: 'गोपनीयता',
      updated: 'अंतिम अद्यतन 2026',
      paragraphs: [
        'NitiDrishti एक नागरिक कल्याण-इंटेलिजेंस उत्पाद है। यह पृष्ठ सार्वजनिक वेब ऐप की जानकारी-नीति बताता है — सरकारी प्रमाणीकरण का दावा नहीं।',
        'अतिथि मोड सर्वर पर शून्य पंक्ति लिखता है। पात्रता स्लाइडर और दस्तावेज़ जाँच इसी ब्राउज़र में रहती है। पूरे पहचान अंक नहीं दिखाए जाते।',
        'साइन-इन खाते केवल सत्र के लिए आवश्यक पंक्तियाँ रखते हैं। साइन आउट डिवाइस सत्र साफ़ करता है। खाते लाइव होने पर प्रोफ़ाइल-पर्ज वैधानिक मिटान का मार्ग है।',
        'योजना पाठ आधिकारिक सरकारी स्रोतों से हमारी पाइपलाइन द्वारा आता है। हम व्यक्तिगत डेटा नहीं बेचते और पेड लाभार्थी API नहीं इस्तेमाल करते।',
        'प्रश्न: hello@nitidrishti.local (उत्पाद इनबॉक्स, 24×7 हेल्पडेस्क नहीं)।',
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of use',
      updated: 'Last updated 2026',
      paragraphs: [
        'NitiDrishti is a civic platform for exploring notified schemes, eligibility rules, and official sources. It is not a government portal and does not disburse benefits.',
        'Always re-verify facts on the source gazette or the issuing department before you apply. Catalog names are public official facts; match results are explanations, not entitlements.',
        'Do not treat chatbot or assistant answers as legal advice. The rule engine prints pass, fail, or unknown from structured clauses — a language model does not cast the final vote.',
        'You are responsible for the accuracy of any profile values you enter. Misuse of the desks, bulk intake, or impersonation of an officer role is not permitted.',
        'These terms may change as the product evolves. Continued use of the public site means you have read this page.',
      ],
    },
    hi: {
      title: 'उपयोग की शर्तें',
      updated: 'अंतिम अद्यतन 2026',
      paragraphs: [
        'NitiDrishti अधिसूचित योजनाएँ, पात्रता नियम और आधिकारिक स्रोत देखने का नागरिक मंच है। यह सरकारी पोर्टल नहीं है और लाभ वितरित नहीं करता।',
        'आवेदन से पहले राजपत्र या जारी विभाग पर तथ्य पुनः जाँचें। कैटलॉग नाम सार्वजनिक आधिकारिक तथ्य हैं; मिलान परिणाम हक नहीं, व्याख्या हैं।',
        'चैटबॉट या सहायक के उत्तर को कानूनी सलाह न मानें। नियम इंजन संरचित खंडों से पास, फेल या अज्ञात छापता है — अंतिम निर्णय भाषा मॉडल नहीं करता।',
        'आप जो प्रोफ़ाइल मान दर्ज करते हैं उनकी सटीकता आपकी ज़िम्मेदारी है। डेस्क, बल्क इनटेक का दुरुपयोग या अधिकारी भूमिका का impersonation अनुमति नहीं।',
        'उत्पाद के साथ ये शर्तें बदल सकती हैं। सार्वजनिक साइट का निरंतर उपयोग इस पृष्ठ को पढ़ने का अर्थ है।',
      ],
    },
  },
} as const;

export function LegalDoc({ kind }: LegalDocProps) {
  const { locale, home } = useLocale();
  const doc = DOCS[kind][locale];

  return (
    <>
      <SiteHeader />
      <main id="content" className="bg-canvas">
        <article className="nd-section max-w-3xl py-14 sm:py-20">
          <p className="nd-eyebrow text-saffron">{home.footer.legal}</p>
          <h1 className="mt-3 text-display font-semibold tracking-tight text-ink">{doc.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{doc.updated}</p>
          <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink-soft">
            {doc.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-10 text-sm">
            <Link href="/" className="font-semibold text-saffron-deep hover:underline">
              ← {locale === 'hi' ? 'NitiDrishti पर लौटें' : 'Back to NitiDrishti'}
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export default LegalDoc;
