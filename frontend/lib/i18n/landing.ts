import type { Locale } from '@/lib/config';

/**
 * Bilingual copy for the public entry experience.
 * Structure (icons, accents, order) lives in the components; only words live here.
 */

export type WorkspaceId = 'citizen' | 'csc' | 'nyaymitra' | 'officer' | 'analytics';
export type CapabilityId =
  | 'eligibility'
  | 'whatif'
  | 'policydiff'
  | 'offline'
  | 'voice'
  | 'dossier';

export interface WorkspaceCopy {
  id: WorkspaceId;
  name: string;
  role: string;
  points: readonly string[];
  status: string;
}

export interface LandingCopy {
  nav: {
    workspaces: string;
    capabilities: string;
    data: string;
    architecture: string;
    languageLabel: string;
    openApp: string;
  };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    titleTail: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: readonly { value: string; label: string; note: string }[];
  };
  flow: {
    eyebrow: string;
    title: string;
    steps: readonly { label: string; note: string }[];
  };
  workspaces: {
    eyebrow: string;
    title: string;
    lede: string;
    items: readonly WorkspaceCopy[];
  };
  capabilities: {
    eyebrow: string;
    title: string;
    lede: string;
    items: readonly { id: CapabilityId; title: string; body: string }[];
  };
  data: {
    eyebrow: string;
    title: string;
    lede: string;
    ruleTitle: string;
    ruleBody: string;
    exceptionTitle: string;
    exceptionBody: string;
    pipelineLabel: string;
    pipeline: readonly string[];
  };
  stack: {
    eyebrow: string;
    title: string;
    groups: readonly { label: string; items: string }[];
  };
  footer: {
    tagline: string;
    backendLabel: string;
    note: string;
  };
  splash: {
    boot: readonly string[];
    badge: string;
    skip: string;
  };
}

const en: LandingCopy = {
  nav: {
    workspaces: 'Workspaces',
    capabilities: 'Capabilities',
    data: 'Data policy',
    architecture: 'Architecture',
    languageLabel: 'हिन्दी',
    openApp: 'Open workspaces',
  },
  hero: {
    eyebrow: 'Welfare & Opportunity Intelligence Platform',
    titleLead: 'Scattered government information,',
    titleAccent: 'turned into verified',
    titleTail: 'and explainable intelligence.',
    lede:
      'NitiDrishti collects schemes, scholarships, jobs, internships and policy documents from official government sources through its own ingestion pipeline, understands them with AI, verifies them, and tells each citizen exactly what they qualify for — and why.',
    ctaPrimary: 'See the workspaces',
    ctaSecondary: 'How the data arrives',
    stats: [
      { value: '5', label: 'Workspaces', note: 'Citizen · CSC · Nyay-Mitra · Officer · Analytics' },
      { value: '6', label: 'Roles', note: 'Access controlled on the server' },
      { value: '0', label: 'Paid data APIs', note: 'Our own official-source pipeline' },
      { value: '12', label: 'Pipeline stages', note: 'Source to verified record' },
    ],
  },
  flow: {
    eyebrow: 'The loop',
    title: 'Six stages between an official document and a citizen decision',
    steps: [
      { label: 'Collect', note: 'Official sources, automatically' },
      { label: 'Understand', note: 'AI reads documents & PDFs' },
      { label: 'Verify', note: 'Validation, source, version' },
      { label: 'Match', note: 'Deterministic rule engine' },
      { label: 'Alert', note: 'Deadlines & policy changes' },
      { label: 'Analyse', note: 'District coverage & gaps' },
    ],
  },
  workspaces: {
    eyebrow: 'Five workspaces, one platform',
    title: 'A dedicated workspace for every person in the delivery chain',
    lede:
      'Instead of forcing one crowded dashboard on everyone, each role gets a workspace designed for the decision it has to make.',
    items: [
      {
        id: 'citizen',
        name: 'Citizen & Student Cockpit',
        role: 'Citizen · Student',
        points: [
          'Personalised schemes, scholarships, jobs and internships',
          'Explainable eligibility with a reason for every condition',
          'What-if simulator, document checklist and Action Dossier',
        ],
        status: 'Builds in Phase 10–12',
      },
      {
        id: 'csc',
        name: 'CSC / Kiosk Desk',
        role: 'Common Service Centre operator',
        points: [
          'Assisted onboarding for citizens who cannot self-serve',
          'Large controls, high contrast, five-step flow',
          'Ink-saving monochrome print for the counter printer',
        ],
        status: 'Builds in Phase 16',
      },
      {
        id: 'nyaymitra',
        name: 'Nyay-Mitra Policy Intelligence',
        role: 'Policy analyst',
        points: [
          'Reads complex and scanned government PDFs with OCR',
          'Extracts clauses and machine-readable eligibility rules',
          'Old vs new policy diff with evidence and impact',
        ],
        status: 'Builds in Phase 13–14',
      },
      {
        id: 'officer',
        name: 'Welfare Officer Desk',
        role: 'Welfare officer',
        points: [
          'Coverage, verification, approval and delivery stages',
          'Drop-off funnel that shows where citizens are lost',
          'Every number traceable to a database query',
        ],
        status: 'Builds in Phase 16',
      },
      {
        id: 'analytics',
        name: 'District Analytics Cockpit',
        role: 'Administrator · Analyst',
        points: [
          'Demand versus coverage, district by district',
          'Map-based gap analysis on real geometry',
          'Targeted intervention instead of guesswork',
        ],
        status: 'Builds in Phase 16',
      },
    ],
  },
  capabilities: {
    eyebrow: 'What makes it different',
    title: 'Six capabilities existing portals do not offer together',
    lede:
      'Every one of these is computed, not decorative — and each is honest about what it does and does not know.',
    items: [
      {
        id: 'eligibility',
        title: 'Deterministic eligibility with explanation',
        body:
          'A rule engine — not a language model — decides eligibility, then shows the pass or fail state of every single condition, with the exact shortfall when a rule fails.',
      },
      {
        id: 'whatif',
        title: 'What-if sensitivity simulator',
        body:
          'Instead of a dead end, the system computes the smallest realistic change that would unlock a benefit, and what that benefit is worth.',
      },
      {
        id: 'policydiff',
        title: 'Policy diff & change intelligence',
        body:
          'When a circular amends a rule, Nyay-Mitra aligns the old and new versions, shows the exact numeric change, cites the clause, and identifies who is affected.',
      },
      {
        id: 'offline',
        title: 'Offline-first for weak connectivity',
        body:
          'A service worker and IndexedDB keep verified information and the eligibility engine working with no internet — every cached item labelled with when it was verified.',
      },
      {
        id: 'voice',
        title: 'Bilingual and voice-assisted',
        body:
          'Hindi and English throughout, with browser-native speech input and read-aloud, so a user who cannot type or read comfortably is not excluded.',
      },
      {
        id: 'dossier',
        title: 'Action Dossier, not just information',
        body:
          'One printable document with the matched benefit, the passed conditions, the document checklist, the official source and where to go next.',
      },
    ],
  },
  data: {
    eyebrow: 'Data policy',
    title: 'The data is ours to collect — not rented from an API',
    lede:
      'This is the constraint the whole architecture is built around, because it decides whether the platform is honest, affordable and independent.',
    ruleTitle: 'No third-party or paid data API',
    ruleBody:
      'Schemes, scholarships, jobs, internships and policy documents are collected by our own pipeline from official government sources: HTML pages, JavaScript-rendered pages, official PDFs, scanned PDFs via OCR, and published CSV, Excel, XML or JSON files.',
    exceptionTitle: 'One narrow exception',
    exceptionBody:
      'An official government API is used only where the data is restricted and cannot be obtained any other way — for example DigiLocker document verification. Until such authorised access exists, the interface says “self-declared” instead of claiming a verification that never happened.',
    pipelineLabel: 'Twelve stages from source to verified record',
    pipeline: [
      'Source registry',
      'Modular connector',
      'Automatic collection',
      'Raw snapshot',
      'Extraction / OCR',
      'AI understanding',
      'Normalisation',
      'Validation',
      'Deduplication',
      'Change detection',
      'Versioning',
      'PostgreSQL',
    ],
  },
  stack: {
    eyebrow: 'Engineering',
    title: 'Chosen for the problem, not for the résumé',
    groups: [
      { label: 'Frontend', items: 'Next.js · TypeScript · Tailwind · Framer Motion' },
      { label: 'Backend', items: 'Python · FastAPI · SQLAlchemy · Alembic' },
      { label: 'Data engineering', items: 'BeautifulSoup · Playwright · PyMuPDF · OCR · Pandas' },
      { label: 'Database', items: 'PostgreSQL · PostGIS · full-text search' },
      { label: 'AI / NLP', items: 'Local models · embeddings · RAG with citations · rule engine' },
      { label: 'Platform', items: 'Docker · scheduled workers · PWA offline' },
    ],
  },
  footer: {
    tagline: 'Right Scheme. Right Opportunity. Right Rule. Right Time.',
    backendLabel: 'Backend',
    note: 'Built as a major project. Government facts are shown with their official source and verification date.',
  },
  splash: {
    boot: [
      'Mounting local policy index…',
      'Compiling deterministic eligibility rules…',
      'Pre-warming offline store & source registry…',
    ],
    badge: 'Official sources only · Zero paid data APIs',
    skip: 'Skip',
  },
};

const hi: LandingCopy = {
  nav: {
    workspaces: 'वर्कस्पेस',
    capabilities: 'क्षमताएँ',
    data: 'डेटा नीति',
    architecture: 'आर्किटेक्चर',
    languageLabel: 'English',
    openApp: 'वर्कस्पेस खोलें',
  },
  hero: {
    eyebrow: 'कल्याण एवं अवसर इंटेलिजेंस प्लेटफ़ॉर्म',
    titleLead: 'बिखरी हुई सरकारी जानकारी को',
    titleAccent: 'सत्यापित और समझ में आने वाली',
    titleTail: 'इंटेलिजेंस में बदलता है।',
    lede:
      'NitiDrishti सरकारी योजनाएँ, छात्रवृत्तियाँ, नौकरियाँ, इंटर्नशिप और नीति दस्तावेज़ आधिकारिक सरकारी स्रोतों से अपनी ही ingestion पाइपलाइन द्वारा एकत्र करता है, उन्हें AI से समझता है, सत्यापित करता है, और हर नागरिक को बताता है कि वह किसके लिए पात्र है — और क्यों।',
    ctaPrimary: 'वर्कस्पेस देखिए',
    ctaSecondary: 'डेटा कैसे आता है',
    stats: [
      { value: '5', label: 'वर्कस्पेस', note: 'नागरिक · CSC · न्याय-मित्र · अधिकारी · एनालिटिक्स' },
      { value: '6', label: 'भूमिकाएँ', note: 'सर्वर पर नियंत्रित पहुँच' },
      { value: '0', label: 'पेड डेटा API', note: 'अपनी आधिकारिक-स्रोत पाइपलाइन' },
      { value: '12', label: 'पाइपलाइन चरण', note: 'स्रोत से सत्यापित रिकॉर्ड तक' },
    ],
  },
  flow: {
    eyebrow: 'पूरा चक्र',
    title: 'आधिकारिक दस्तावेज़ से नागरिक के निर्णय तक छह चरण',
    steps: [
      { label: 'संग्रह', note: 'आधिकारिक स्रोत, स्वतः' },
      { label: 'समझ', note: 'AI दस्तावेज़ और PDF पढ़ता है' },
      { label: 'सत्यापन', note: 'वैलिडेशन, स्रोत, संस्करण' },
      { label: 'मिलान', note: 'नियम-आधारित पात्रता इंजन' },
      { label: 'अलर्ट', note: 'समय-सीमा और नीति परिवर्तन' },
      { label: 'विश्लेषण', note: 'ज़िला कवरेज और अंतर' },
    ],
  },
  workspaces: {
    eyebrow: 'पाँच वर्कस्पेस, एक प्लेटफ़ॉर्म',
    title: 'वितरण श्रृंखला के हर व्यक्ति के लिए अलग वर्कस्पेस',
    lede:
      'सबको एक ही भरे-पूरे डैशबोर्ड में उलझाने के बजाय, हर भूमिका को उसके निर्णय के हिसाब से बनाया गया वर्कस्पेस मिलता है।',
    items: [
      {
        id: 'citizen',
        name: 'नागरिक एवं विद्यार्थी कॉकपिट',
        role: 'नागरिक · विद्यार्थी',
        points: [
          'प्रोफ़ाइल के अनुसार योजनाएँ, छात्रवृत्ति, नौकरी और इंटर्नशिप',
          'हर शर्त का कारण दिखाने वाली पात्रता',
          'व्हाट-इफ़ सिम्युलेटर, दस्तावेज़ सूची और एक्शन डोज़ियर',
        ],
        status: 'फेज़ 10–12 में',
      },
      {
        id: 'csc',
        name: 'CSC / कियोस्क डेस्क',
        role: 'जन सेवा केंद्र संचालक',
        points: [
          'उन नागरिकों के लिए सहायता, जो स्वयं आवेदन नहीं कर सकते',
          'बड़े नियंत्रण, उच्च कंट्रास्ट, पाँच-चरणीय प्रवाह',
          'काउंटर प्रिंटर के लिए स्याही-बचत मोनोक्रोम प्रिंट',
        ],
        status: 'फेज़ 16 में',
      },
      {
        id: 'nyaymitra',
        name: 'न्याय-मित्र नीति इंटेलिजेंस',
        role: 'नीति विश्लेषक',
        points: [
          'जटिल और स्कैन किए गए सरकारी PDF को OCR से पढ़ता है',
          'क्लॉज़ और मशीन-पठनीय पात्रता नियम निकालता है',
          'पुरानी बनाम नई नीति का अंतर, प्रमाण और प्रभाव के साथ',
        ],
        status: 'फेज़ 13–14 में',
      },
      {
        id: 'officer',
        name: 'कल्याण अधिकारी डेस्क',
        role: 'कल्याण अधिकारी',
        points: [
          'कवरेज, सत्यापन, स्वीकृति और लाभ वितरण के चरण',
          'ड्रॉप-ऑफ़ फ़नल, जो बताता है नागरिक कहाँ छूट रहे हैं',
          'हर आँकड़ा डेटाबेस क्वेरी से जुड़ा हुआ',
        ],
        status: 'फेज़ 16 में',
      },
      {
        id: 'analytics',
        name: 'ज़िला एनालिटिक्स कॉकपिट',
        role: 'प्रशासक · विश्लेषक',
        points: [
          'ज़िले-दर-ज़िले माँग बनाम कवरेज',
          'वास्तविक भौगोलिक डेटा पर नक्शा-आधारित अंतर विश्लेषण',
          'अनुमान की जगह लक्षित हस्तक्षेप',
        ],
        status: 'फेज़ 16 में',
      },
    ],
  },
  capabilities: {
    eyebrow: 'यह अलग क्यों है',
    title: 'छह क्षमताएँ, जो मौजूदा पोर्टल एक साथ नहीं देते',
    lede:
      'इनमें से हर एक गणना से बनती है, सजावट से नहीं — और हर एक यह मानने में ईमानदार है कि वह क्या नहीं जानती।',
    items: [
      {
        id: 'eligibility',
        title: 'नियम-आधारित पात्रता, कारण के साथ',
        body:
          'पात्रता का निर्णय भाषा मॉडल नहीं, नियम इंजन करता है — और हर शर्त का पास/फेल स्थिति के साथ, नियम फेल होने पर सटीक कमी भी दिखाता है।',
      },
      {
        id: 'whatif',
        title: 'व्हाट-इफ़ सेंसिटिविटी सिम्युलेटर',
        body:
          'रास्ता बंद बताने के बजाय सिस्टम गणना करता है कि किस सबसे छोटे व्यावहारिक बदलाव से लाभ खुल जाएगा और उसका मूल्य कितना है।',
      },
      {
        id: 'policydiff',
        title: 'नीति अंतर एवं परिवर्तन इंटेलिजेंस',
        body:
          'जब कोई परिपत्र नियम बदलता है, न्याय-मित्र पुराने और नए संस्करण को मिलाकर सटीक संख्यात्मक बदलाव, संबंधित क्लॉज़ और प्रभावित वर्ग बताता है।',
      },
      {
        id: 'offline',
        title: 'कमज़ोर कनेक्टिविटी के लिए ऑफ़लाइन-फ़र्स्ट',
        body:
          'सर्विस वर्कर और IndexedDB बिना इंटरनेट भी सत्यापित जानकारी और पात्रता इंजन चलाते हैं — हर संचित प्रविष्टि पर सत्यापन की तारीख अंकित रहती है।',
      },
      {
        id: 'voice',
        title: 'द्विभाषी और वॉयस-सहायक',
        body:
          'पूरे ऐप में हिंदी और अंग्रेज़ी, ब्राउज़र-आधारित वॉयस इनपुट और पढ़कर सुनाने की सुविधा — ताकि टाइप या पढ़ न पाने वाला उपयोगकर्ता भी छूटे नहीं।',
      },
      {
        id: 'dossier',
        title: 'सिर्फ़ जानकारी नहीं, एक्शन डोज़ियर',
        body:
          'एक प्रिंट-योग्य दस्तावेज़: मिला लाभ, पूरी हुई शर्तें, दस्तावेज़ सूची, आधिकारिक स्रोत और आगे कहाँ जाना है।',
      },
    ],
  },
  data: {
    eyebrow: 'डेटा नीति',
    title: 'डेटा हम स्वयं एकत्र करते हैं — किसी API से किराए पर नहीं लेते',
    lede:
      'पूरा आर्किटेक्चर इसी शर्त पर बना है, क्योंकि यही तय करता है कि प्लेटफ़ॉर्म ईमानदार, किफ़ायती और स्वतंत्र रहेगा या नहीं।',
    ruleTitle: 'कोई तीसरे पक्ष या पेड डेटा API नहीं',
    ruleBody:
      'योजनाएँ, छात्रवृत्तियाँ, नौकरियाँ, इंटर्नशिप और नीति दस्तावेज़ हमारी अपनी पाइपलाइन आधिकारिक सरकारी स्रोतों से लाती है: HTML पेज, जावास्क्रिप्ट-रेंडर पेज, आधिकारिक PDF, OCR द्वारा स्कैन किए PDF, तथा प्रकाशित CSV, Excel, XML या JSON फ़ाइलें।',
    exceptionTitle: 'केवल एक सीमित अपवाद',
    exceptionBody:
      'आधिकारिक सरकारी API सिर्फ़ वहाँ उपयोग होगा जहाँ डेटा प्रतिबंधित है और किसी अन्य तरीक़े से नहीं मिल सकता — जैसे DigiLocker दस्तावेज़ सत्यापन। जब तक वैसी अधिकृत पहुँच न हो, इंटरफ़ेस “स्व-घोषित” लिखेगा, झूठा सत्यापन नहीं दिखाएगा।',
    pipelineLabel: 'स्रोत से सत्यापित रिकॉर्ड तक बारह चरण',
    pipeline: [
      'स्रोत रजिस्ट्री',
      'मॉड्यूलर कनेक्टर',
      'स्वतः संग्रह',
      'रॉ स्नैपशॉट',
      'निष्कर्षण / OCR',
      'AI समझ',
      'सामान्यीकरण',
      'वैलिडेशन',
      'डुप्लिकेट निवारण',
      'परिवर्तन पहचान',
      'संस्करण नियंत्रण',
      'PostgreSQL',
    ],
  },
  stack: {
    eyebrow: 'इंजीनियरिंग',
    title: 'समस्या के हिसाब से चुना गया, रिज़्यूमे के लिए नहीं',
    groups: [
      { label: 'फ़्रंटएंड', items: 'Next.js · TypeScript · Tailwind · Framer Motion' },
      { label: 'बैकएंड', items: 'Python · FastAPI · SQLAlchemy · Alembic' },
      { label: 'डेटा इंजीनियरिंग', items: 'BeautifulSoup · Playwright · PyMuPDF · OCR · Pandas' },
      { label: 'डेटाबेस', items: 'PostgreSQL · PostGIS · फुल-टेक्स्ट सर्च' },
      { label: 'AI / NLP', items: 'लोकल मॉडल · एम्बेडिंग · प्रमाण-सहित RAG · नियम इंजन' },
      { label: 'प्लेटफ़ॉर्म', items: 'Docker · शेड्यूल्ड वर्कर · PWA ऑफ़लाइन' },
    ],
  },
  footer: {
    tagline: 'सही योजना। सही अवसर। सही नियम। सही समय।',
    backendLabel: 'बैकएंड',
    note: 'मेजर प्रोजेक्ट के रूप में निर्मित। सरकारी तथ्य उनके आधिकारिक स्रोत और सत्यापन तिथि के साथ दिखाए जाते हैं।',
  },
  splash: {
    boot: [
      'स्थानीय नीति सूचकांक लोड हो रहा है…',
      'पात्रता नियम संकलित हो रहे हैं…',
      'ऑफ़लाइन स्टोर और स्रोत रजिस्ट्री तैयार हो रही है…',
    ],
    badge: 'केवल आधिकारिक स्रोत · कोई पेड डेटा API नहीं',
    skip: 'छोड़ें',
  },
};

export const LANDING_COPY: Record<Locale, LandingCopy> = { en, hi };
