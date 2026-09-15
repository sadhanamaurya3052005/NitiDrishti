import type { Locale } from '@/lib/config';

export interface ShowcaseCopy {
  hero: {
    walkthroughEyebrow: string;
    walkthroughTitle: string;
    walkthroughHint: string;
  };
  gateways: {
    eyebrow: string;
    title: string;
    lede: string;
    enter: string;
    cards: readonly {
      id: 'citizen' | 'csc' | 'officer';
      kicker: string;
      name: string;
      target: string;
      scope: string;
      href: string;
      chips: readonly string[];
    }[];
  };
  marquee: {
    title: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lede: string;
    points: readonly { kicker: string; title: string; body: string }[];
    videoHint: string;
  };
  safety: {
    eyebrow: string;
    title: string;
    badges: readonly { id: string; label: string; hover: string }[];
  };
  footer: {
    mandate: string;
    mandateBody: string;
    statutory: string;
    statutoryItems: readonly string[];
    engine: string;
    engineItems: readonly string[];
    open: string;
    openBody: string;
  };
  copilot: {
    camera: string;
    cameraNote: string;
  };
}

const en: ShowcaseCopy = {
  hero: {
    walkthroughEyebrow: 'Walkthrough platform',
    walkthroughTitle: 'Watch the platform film',
    walkthroughHint: 'The platform film plays in this dialog when a recording is attached.',
  },
  gateways: {
    eyebrow: 'Choose a desk',
    title: 'Three doors. Three jobs. One rule engine.',
    lede: 'Homepage does not calculate. It routes. Each gateway is a dedicated workspace — citizen, village kiosk, district command.',
    enter: 'Enter desk',
    cards: [
      {
        id: 'citizen',
        kicker: '01  Citizen & Nyaya-Mitra',
        name: 'See the rule fire before the tehsil.',
        target: 'Beneficiaries and families looking for a stacked entitlement.',
        scope: 'Vernacular query, sliders, local document vault, AST pass/fail, Wachter what-if, Suniye audio.',
        href: '/citizen',
        chips: ['AST', 'What-If', 'Document vault'],
      },
      {
        id: 'csc',
        kicker: '02  CSC kiosk terminal',
        name: 'A two-minute intake that survives a blackout.',
        target: 'Village Level Entrepreneurs and panchayat operators.',
        scope: 'Keyboard-first HUD, local IndexedDB queue, dual print (80mm / A4), F12 sync when the net returns.',
        href: '/csc',
        chips: ['PWA', 'IndexedDB', 'Thermal / A4'],
      },
      {
        id: 'officer',
        kicker: '03  Welfare & geo-analytics',
        name: 'Tehsils as a map. Circulars as a delta.',
        target: 'Block and district welfare officers.',
        scope: 'GeoJSON layer when official files exist, 5-stage funnel from live rows, gazette drop, hypothetical cap slider.',
        href: '/welfare',
        chips: ['PostGIS', 'Funnel', 'Gazette diff'],
      },
    ],
  },
  marquee: {
    title: 'Find schemes based on category',
  },
  about: {
    eyebrow: 'About NitiDrishti',
    title: 'About NitiDrishti',
    lede: 'NitiDrishti is a civic platform that helps a citizen, a village kiosk, and a welfare officer read the same government scheme in the same language: the gazette rule, the official source, and a pass or fail that a chatbot is not allowed to invent. We collect from government pages and PDFs, version every change, and keep guest sessions at zero server rows — so a family can see what they qualify for before they stand in the tehsil queue.',
    points: [
      {
        kicker: 'One reading of the rule',
        title: 'Eligibility is mathematics, then a source',
        body: 'Age, income, land and category are evaluated as structured inequalities. A language model may help extract a clause. It never casts the final vote.',
      },
      {
        kicker: 'Three desks, one truth',
        title: 'Citizen, CSC, and welfare command',
        body: 'The homepage only routes. Each desk is a real workspace — vernacular query and a local vault for families, an offline kiosk for the village operator, a map and gazette delta for the officer.',
      },
      {
        kicker: 'Privacy by design',
        title: 'DPDPA-shaped, not a slogan',
        body: 'Raw Aadhaar digits are never a column. Identifiers stay masked on this device. Guest mode writes nothing to the server.',
      },
    ],
    videoHint: '',
  },
  safety: {
    eyebrow: 'Safety',
    title: 'Trust, shown — not narrated',
    badges: [
      {
        id: 'dpdpa',
        label: 'DPDPA 2023 design',
        hover: 'Guest writes 0 server rows. Raw Aadhaar digits are never a column. Right-to-forget is a hard delete once accounts exist.',
      },
      {
        id: 'mask',
        label: 'Sovereign masking',
        hover: 'Identifiers, if typed, render as XXXX-XXXX-1234 on this device. Digits are not uploaded.',
      },
      {
        id: 'ast',
        label: 'Deterministic AST',
        hover: 'Pass / fail / unknown from structured rules. No black-box LLM eligibility vote.',
      },
      {
        id: 'cloud',
        label: 'No rented scheme API',
        hover: 'Frontend talks only to our FastAPI. Official pages are ingested by our pipeline — not a paid data vendor.',
      },
      {
        id: 'pwa',
        label: 'Offline-ready PWA',
        hover: 'Production registers a service worker. Localhost does not, so you are not fighting a stale cache. IndexedDB holds the kiosk queue on this device.',
      },
    ],
  },
  footer: {
    mandate: 'Civic OS',
    mandateBody:
      'Find the right notified scheme, with the rule and the source — before the tehsil queue.',
    statutory: 'Statutory alignment',
    statutoryItems: ['DPDPA 2023', 'Aadhaar Act Sec. 29 (no full ID display)', 'IT Act 2000 — lawful processing'],
    engine: 'What is running now',
    engineItems: ['Deterministic AST (client)', 'FastAPI + PostgreSQL', 'IndexedDB kiosk queue', 'PWA (production)'],
    open: 'Open civic alignment',
    openBody: 'Ingestion targets official government HTML, PDFs and CSV. data.gov.in is a reference ecosystem — not a partnership badge.',
  },
  copilot: {
    camera: 'Camera',
    cameraNote: 'The photo stays in this tab. Certificate OCR is not live — confirm age and income on the citizen desk yourself.',
  },
};

const hi: ShowcaseCopy = {
  hero: {
    walkthroughEyebrow: 'वॉकथ्रू प्लेटफ़ॉर्म',
    walkthroughTitle: 'प्लेटफ़ॉर्म फ़िल्म देखें',
    walkthroughHint: 'रिकॉर्डिंग जुड़ने पर प्लेटफ़ॉर्म फ़िल्म इसी संवाद में चलेगी।',
  },
  gateways: {
    eyebrow: 'डेस्क चुनें',
    title: 'तीन द्वार। तीन काम। एक नियम इंजन।',
    lede: 'होमपेज गणना नहीं करता। वह रास्ता दिखाता है। हर गेटवे एक अलग कार्यक्षेत्र है।',
    enter: 'डेस्क खोलें',
    cards: [
      {
        id: 'citizen',
        kicker: '01  नागरिक एवं न्याय-मित्र',
        name: 'तहसील से पहले नियम दिखे।',
        target: 'लाभार्थी और परिवार जो स्टैक्ड हक खोज रहे हैं।',
        scope: 'बोलचाल प्रश्न, स्लाइडर, लोकल दस्तावेज़ तिजोरी, AST, What-If, सुनिए ऑडियो।',
        href: '/citizen',
        chips: ['AST', 'What-If', 'दस्तावेज़ तिजोरी'],
      },
      {
        id: 'csc',
        kicker: '02  CSC कियोस्क टर्मिनल',
        name: 'दो मिनट का इनटेक जो ब्लैकआउट सहे।',
        target: 'ग्राम स्तरीय उद्यमी और पंचायत संचालक।',
        scope: 'कीबोर्ड-प्रथम HUD, IndexedDB कतार, 80mm / A4 प्रिंट, नेट आने पर F12 सिंक।',
        href: '/csc',
        chips: ['PWA', 'IndexedDB', 'थर्मल / A4'],
      },
      {
        id: 'officer',
        kicker: '03  कल्याण एवं भू-एनालिटिक्स',
        name: 'तहसील नक्शा बने। परिपत्र अंतर बने।',
        target: 'ब्लॉक और ज़िला कल्याण अधिकारी।',
        scope: 'आधिकारिक GeoJSON आने पर परत, लाइव पंक्तियों से फ़नल, राजपत्र ड्रॉप, काल्पनिक स्लैब स्लाइडर।',
        href: '/welfare',
        chips: ['PostGIS', 'फ़नल', 'राजपत्र अंतर'],
      },
    ],
  },
  marquee: {
    title: 'श्रेणी के अनुसार योजनाएँ खोजें',
  },
  about: {
    eyebrow: 'नीतिदृष्टि के बारे में',
    title: 'नीतिदृष्टि के बारे में',
    lede: 'नीतिदृष्टि एक नागरिक मंच है जहाँ लाभार्थी, ग्राम कियोस्क और कल्याण अधिकारी एक ही सरकारी योजना को एक ही भाषा में पढ़ते हैं: राजपत्र का नियम, आधिकारिक स्रोत, और पास या फेल जिसे चैटबॉट गढ़ नहीं सकता। हम सरकारी पृष्ठों और PDF से संग्रह करते हैं, हर बदलाव का संस्करण रखते हैं, और अतिथि सत्र सर्वर पर शून्य पंक्ति छोड़ते हैं — ताकि परिवार तहसील कतार से पहले अपना हक देख सके।',
    points: [
      {
        kicker: 'एक नियम, एक पाठ',
        title: 'पात्रता गणित है, फिर स्रोत',
        body: 'आयु, आय, भूमि और श्रेणी संरचित असमानताओं से तय होती हैं। भाषा मॉडल खंड निकाल सकता है। अंतिम वोट नहीं डालता।',
      },
      {
        kicker: 'तीन डेस्क, एक सत्य',
        title: 'नागरिक, CSC और कल्याण कमान',
        body: 'होमपेज केवल रास्ता दिखाता है। हर डेस्क असली कार्यक्षेत्र है — परिवार के लिए बोलचाल प्रश्न और लोकल तिजोरी, संचालक के लिए ऑफ़लाइन कियोस्क, अधिकारी के लिए नक्शा और राजपत्र अंतर।',
      },
      {
        kicker: 'डिज़ाइन से गोपनीयता',
        title: 'DPDPA आकार, नारा नहीं',
        body: 'कच्चे आधार अंक कभी कॉलम नहीं। पहचान इसी उपकरण पर मास्क्ड रहती है। अतिथि मोड सर्वर पर कुछ नहीं लिखता।',
      },
    ],
    videoHint: '',
  },
  safety: {
    eyebrow: 'सुरक्षा',
    title: 'भरोसा दिखाया जाए — लिखा न जाए',
    badges: [
      {
        id: 'dpdpa',
        label: 'DPDPA 2023 डिज़ाइन',
        hover: 'अतिथि सर्वर पर 0 पंक्ति। कच्चे आधार अंक कभी कॉलम नहीं। मिटाने का अधिकार हार्ड-डिलीट है।',
      },
      {
        id: 'mask',
        label: 'मास्किंग मानक',
        hover: 'पहचान अंक XXXX-XXXX-1234 दिखते हैं। अपलोड नहीं होते।',
      },
      {
        id: 'ast',
        label: 'नियतात्मक AST',
        hover: 'पास / फेल / अज्ञात संरचित नियमों से। LLM पात्रता वोट नहीं।',
      },
      {
        id: 'cloud',
        label: 'किराए की स्कीम API नहीं',
        hover: 'फ्रंटएंड केवल हमारे FastAPI से बात करता है। आधिकारिक पृष्ठ हमारी पाइपलाइन से।',
      },
      {
        id: 'pwa',
        label: 'ऑफ़लाइन PWA',
        hover: 'प्रोडक्शन में सर्विस वर्कर। localhost पर नहीं — पुराना कैश न लड़े। कियोस्क कतार IndexedDB में।',
      },
    ],
  },
  footer: {
    mandate: 'नागरिक OS',
    mandateBody:
      'सही अधिसूचित योजना, नियम और स्रोत के साथ — तहसील कतार से पहले।',
    statutory: 'वैधानिक संरेखण',
    statutoryItems: ['DPDPA 2023', 'आधार अधिनियम धारा 29', 'आईटी अधिनियम 2000'],
    engine: 'अभी क्या चल रहा है',
    engineItems: ['नियतात्मक AST (क्लाइंट)', 'FastAPI + PostgreSQL', 'IndexedDB कियोस्क कतार', 'PWA (प्रोडक्शन)'],
    open: 'ओपन सिविक संरेखण',
    openBody: 'Ingestion आधिकारिक सरकारी HTML, PDF, CSV पर। data.gov.in संदर्भ पारिस्थितिकी है — साझेदारी बैज नहीं।',
  },
  copilot: {
    camera: 'कैमरा',
    cameraNote: 'फ़ोटो इसी टैब में रहती है। OCR लाइव नहीं — आयु और आय नागरिक डेस्क पर स्वयं पुष्टि करें।',
  },
};

export const SHOWCASE_COPY: Record<Locale, ShowcaseCopy> = { en, hi };
