import type { Locale } from '@/lib/config';
import { OFFICIAL_SCHEME_CATALOG } from '@/lib/schemes/catalog';

export interface AssistantReply {
  text: string;
  citations: string[];
}

const FAQ_FACTS: Record<
  Locale,
  { keys: string[]; text: string }[]
> = {
  en: [
    {
      keys: ['hello', 'hi', 'namaste', 'help'],
      text: 'Namaste. I am NitiDrishti Mitra. Ask about a scheme, eligibility rules, DPDP privacy, the five desks, or the offline engine. I only answer from this product’s catalog — I will not invent a gazette.',
    },
    {
      keys: ['eligibility', 'ast', 'rule', 'engine', 'qualify'],
      text: 'Eligibility is decided by a deterministic AST engine (AND / OR, age, income, land, category) — not a language model. Every fail shows the exact shortfall. Open a workspace and use Check eligibility on a scheme card.',
    },
    {
      keys: ['aadhaar', 'privacy', 'dpdp', 'pii', 'guest'],
      text: 'Guest mode writes zero server rows. Raw national ID digits are never stored. Document OCR stays in browser memory. A profile is kept only after explicit DPDP consent. Right to forget is DELETE /api/v1/profile/purge.',
    },
    {
      keys: ['offline', 'pwa', 'internet', 'network'],
      text: 'The PWA caches the shell and rule catalog. When the network drops, the offline pill turns amber and eligibility still runs on this device.',
    },
    {
      keys: ['workspace', 'desk', 'citizen', 'csc', 'nyay', 'welfare', 'analytics', 'kiosk'],
      text: 'Five desks share one catalog: Citizen cockpit, CSC kiosk, Nyay-Mitra gazette intelligence, Welfare command, and PostGIS analytics. Use the cards on the homepage to open them.',
    },
    {
      keys: ['dossier', 'pdf', 'print'],
      text: 'Save a scheme to the dossier queue. The Action Dossier is a monochrome A4 with checklist, gazette hash and helpline — built for a CSC printer.',
    },
    {
      keys: ['data', 'api', 'source', 'ingest'],
      text: 'Scheme facts come from our own connectors on official government HTML, JS portals, PDFs, scans and CSV. No paid third-party scheme API. Restricted platforms only when the law requires an official assertion.',
    },
  ],
  hi: [
    {
      keys: ['hello', 'hi', 'namaste', 'नमस्ते', 'मदद', 'help'],
      text: 'नमस्ते। मैं नीतिदृष्टि मित्र हूँ। योजना, पात्रता नियम, DPDP गोपनीयता, पाँच डेस्क या ऑफ़लाइन इंजन पूछें। मैं केवल इस उत्पाद की सूची से उत्तर दूँगा — राजपत्र गढ़ूँगा नहीं।',
    },
    {
      keys: ['eligibility', 'पात्र', 'नियम', 'engine', 'ast'],
      text: 'पात्रता AST नियम इंजन तय करता है (आयु, आय, भूमि, श्रेणी) — भाषा मॉडल नहीं। हर फेल पर सटीक कमी दिखती है। वर्कस्पेस खोलकर योजना कार्ड पर पात्रता जाँचें।',
    },
    {
      keys: ['aadhaar', 'आधार', 'गोपनीयता', 'dpdp', 'guest', 'अतिथि'],
      text: 'अतिथि मोड सर्वर पर शून्य पंक्ति लिखता है। कच्चे पहचान अंक कभी संग्रहीत नहीं। OCR ब्राउज़र मेमोरी में रहता है। प्रोफ़ाइल केवल स्पष्ट DPDP सहमति पर।',
    },
    {
      keys: ['offline', 'ऑफलाइन', 'इंटरनेट', 'pwa'],
      text: 'PWA शेल और नियम कैटलॉग कैश करता है। नेटवर्क गिरने पर ऑफ़लाइन पिल एम्बर होता है और पात्रता इसी डिवाइस पर चलती है।',
    },
    {
      keys: ['workspace', 'डेस्क', 'नागरिक', 'csc', 'न्याय', 'analytics'],
      text: 'पाँच डेस्क: नागरिक कॉकपिट, CSC कियोस्क, न्याय-मित्र, कल्याण कमांड, PostGIS एनालिटिक्स। होमपेज के कार्ड से खोलें।',
    },
    {
      keys: ['dossier', 'pdf', 'डोज़ियर', 'प्रिंट'],
      text: 'योजना सहेजें। एक्शन डोज़ियर मोनोक्रोम A4 है — सूची, राजपत्र हैश, हेल्पलाइन — CSC प्रिंटर के लिए।',
    },
    {
      keys: ['data', 'api', 'स्रोत', 'डेटा'],
      text: 'योजना तथ्य हमारी कनेक्टर पाइपलाइन आधिकारिक सरकारी HTML, पोर्टल, PDF और CSV से लाती है। पेड थर्ड-पार्टी स्कीम API नहीं।',
    },
  ],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function answerAssistant(query: string, locale: Locale): AssistantReply {
  const q = normalize(query);
  if (!q) {
    return {
      text:
        locale === 'hi'
          ? 'कुछ लिखें या माइक दबाएँ।'
          : 'Type a question or tap the mic.',
      citations: [],
    };
  }

  const schemeHits = OFFICIAL_SCHEME_CATALOG.filter((scheme) => {
    const blob = normalize(
      `${scheme.id} ${scheme.name} ${scheme.nameHi} ${scheme.code} ${scheme.summary} ${scheme.summaryHi} ${scheme.benefit}`,
    );
    if (blob.includes(q) || q.includes(normalize(scheme.code))) return true;
    return q
      .split(' ')
      .filter((word) => word.length >= 4)
      .some((word) => blob.includes(word));
  }).slice(0, 2);

  if (schemeHits.length) {
    const lines = schemeHits.map((scheme) => {
      const name = locale === 'hi' ? scheme.nameHi : scheme.name;
      const summary = locale === 'hi' ? scheme.summaryHi : scheme.summary;
      const benefit = locale === 'hi' ? scheme.benefitHi : scheme.benefit;
      return `${name} (${scheme.code}): ${summary} ${locale === 'hi' ? 'लाभ' : 'Benefit'}: ${benefit}.`;
    });
    return {
      text: lines.join('\n\n'),
      citations: schemeHits.map((scheme) => scheme.sourceUrl),
    };
  }

  const fact = FAQ_FACTS[locale].find((item) => item.keys.some((key) => q.includes(key)));
  if (fact) {
    return { text: fact.text, citations: ['NitiDrishti product index'] };
  }

  return {
    text:
      locale === 'hi'
        ? 'यह प्रश्न मेरे अनुक्रमित राजपत्र/कैटलॉग में नहीं है। योजना का नाम, पात्रता, गोपनीयता, पाँच डेस्क या ऑफ़लाइन मोड पूछें। गढ़ा हुआ उत्तर नहीं दूँगा।'
        : 'That is not in my indexed catalog. Ask about a named scheme, eligibility, privacy, the five desks, or offline mode. I will not invent an answer.',
    citations: [],
  };
}
