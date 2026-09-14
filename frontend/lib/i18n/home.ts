import type { Locale } from '@/lib/config';
import type { SchemeCategory } from '@/types';

export interface HomeCopy {
  a11y: {
    font: string;
    contrastDefault: string;
    contrastHigh: string;
    language: string;
    audioPreview: string;
    skipToContent: string;
  };
  nav: {
    about: string;
    schemes: string;
    walkthrough: string;
    faq: string;
    signIn: string;
    signOut: string;
    guest: string;
  };
  role: {
    citizen: string;
    csc: string;
  };
  hero: {
    walkthroughCta: string;
    slides: readonly { kicker: string; title: string; body: string }[];
  };
  walkthrough: {
    eyebrow: string;
    title: string;
    play: string;
    close: string;
    captions: string;
    steps: readonly { title: string; body: string }[];
  };
  schemes: {
    eyebrow: string;
    title: string;
    lede: string;
    search: string;
    income: string;
    caste: string;
    state: string;
    allStates: string;
    check: string;
    explain: string;
    save: string;
    saved: string;
    empty: string;
    live: string;
    catalog: string;
    filters: readonly { id: 'all' | SchemeCategory; label: string }[];
  };
  inspector: {
    title: string;
    score: string;
    eligible: string;
    partial: string;
    ineligible: string;
    close: string;
    remediation: string;
  };
  locker: {
    eyebrow: string;
    title: string;
    lede: string;
    privacy: string;
    drop: string;
    scanning: string;
    extracted: string;
    bulkTitle: string;
    bulkHint: string;
    queue: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lede: string;
    chapters: readonly { kicker: string; title: string; body: string }[];
  };
  architecture: {
    eyebrow: string;
    title: string;
    lede: string;
    principleLabel: string;
    principle: string;
    cards: readonly {
      id: 'citizen' | 'csc' | 'district';
      kicker: string;
      name: string;
      audience: string;
      problem: string;
      pipelineLabel: string;
      pipeline: readonly string[];
      engines: readonly string[];
      flowLabel?: string;
      flow?: readonly string[];
      printLabel?: string;
      print?: readonly { state: 'pass' | 'fail' | 'delta'; text: string }[];
      cta: string;
      href: string;
      also?: readonly { label: string; href: string }[];
    }[];
  };
  faq: {
    eyebrow: string;
    title: string;
    more: string;
    less: string;
    items: readonly { q: string; a: string }[];
  };
  footer: {
    product: string;
    legal: string;
    contact: string;
    grievance: string;
    attributions: string;
    diagnostics: string;
    latency: string;
    env: string;
    links: readonly { label: string; href: string }[];
  };
  auth: {
    title: string;
    guest: string;
    guestHint: string;
    citizen: string;
    csc: string;
    name: string;
    continue: string;
    note: string;
  };
  pwa: {
    install: string;
    online: string;
    offline: string;
    worker: string;
  };
}

const en: HomeCopy = {
  a11y: {
    font: 'Text size',
    contrastDefault: 'Default',
    contrastHigh: 'High contrast',
    language: 'Language',
    audioPreview: 'Hear Hindi prompt',
    skipToContent: 'Skip to content',
  },
  nav: {
    about: 'About',
    schemes: 'Schemes',
    walkthrough: 'Walkthrough',
    faq: 'FAQ',
    signIn: 'Sign in',
    signOut: 'Sign out',
    guest: 'Guest · 0-PII',
  },
  role: {
    citizen: 'Citizen / Beneficiary',
    csc: 'Kendra / CSC Agent',
  },
  hero: {
    walkthroughCta: 'Watch the 90-second platform film',
    slides: [
      {
        kicker: 'Agrarian delivery',
        title: 'Kisan entitlement, printed as a rule.',
        body: 'Direct income support and crop-loss cover evaluated on this device — pass or fail with the gazette inequality, not a chatbot guess.',
      },
      {
        kicker: 'Women & collectives',
        title: 'SHG credit and maternity DBT on one desk.',
        body: 'Rural women do not need five portals. The same AST stacks notified women and child schemes from official facts.',
      },
      {
        kicker: 'Higher education',
        title: 'Scholarships that show the income ceiling.',
        body: 'Post-matric and merit grants carry the notified cap. Fail prints the exact rupee shortfall — Wachter what-if, not a slogan.',
      },
      {
        kicker: 'Artisans & livelihood',
        title: 'PM Vishwakarma and MSME credit, stacked legally.',
        body: 'Collateral-free notified slabs for traditional trades. Competing schemes are flagged; the engine does not invent a loan.',
      },
      {
        kicker: 'Tehsil delivery & health',
        title: 'Hospital cover without shipping the file to a vendor.',
        body: 'Ayushman-class eligibility stays a structured rule. The photo of a certificate never leaves this browser as raw identity digits.',
      },
    ],
  },
  walkthrough: {
    eyebrow: '90 seconds',
    title: 'Watch how NitiDrishti works',
    play: 'Watch the 90-second platform film',
    close: 'Close',
    captions: 'Captions',
    steps: [
      {
        title: 'The agenda: right scheme, right citizen, right rule',
        body: 'NitiDrishti + SIH260092 is a civic engine. It collects official welfare, scholarships and enterprise credit, then tells each person — farmer, SHG woman, student, artisan — what they qualify for, and why.',
      },
      {
        title: 'Data we collect ourselves — not rent',
        body: 'HTML pages, JavaScript portals, gazette PDFs, scans and CSV from government domains. No paid scheme API. Restricted platforms only when the law requires an official assertion.',
      },
      {
        title: 'Five desks. One truth.',
        body: 'Citizen cockpit, CSC kiosk, Nyay-Mitra gazette intelligence, welfare command, and PostGIS district analytics. Same schemes. Different jobs in the delivery chain.',
      },
      {
        title: 'Eligibility is mathematics, not a chatbot',
        body: 'An AST rule engine passes or fails age, income, land, category. A language model may extract a clause. It never casts the final vote. Every fail shows the exact shortfall.',
      },
      {
        title: 'Guest mode leaves zero server rows',
        body: 'DPDP 2023: no raw Aadhaar digits in any column. Consent before a profile is kept. Right to forget wipes it. Papers for OCR stay in browser memory.',
      },
      {
        title: 'From match to a printable Action Dossier',
        body: 'Save a scheme, download a monochrome A4: checklist, gazette hash, helpline. Offline PWA keeps the rule engine alive in a village kendra when the network drops.',
      },
    ],
  },
  schemes: {
    eyebrow: 'Directory',
    title: 'Scheme intelligence, not a brochure wall',
    lede: 'Filter by life-situation. Eligibility is computed on this device against the active rule set.',
    search: 'Search schemes',
    income: 'Annual income',
    caste: 'Category',
    state: 'State / UT',
    allStates: 'All India / any state',
    check: 'Check eligibility',
    explain: 'Explain logic',
    save: 'Save to dossier',
    saved: 'Saved',
    empty: 'No schemes match these filters. Broaden income or category.',
    live: 'Live from API',
    catalog: 'Official catalog (API warming up)',
    filters: [
      { id: 'all', label: 'All schemes' },
      { id: 'agriculture', label: 'Agriculture & allied' },
      { id: 'women', label: 'Women & child' },
      { id: 'education', label: 'Education & skilling' },
      { id: 'health', label: 'Health & senior citizens' },
      { id: 'msme', label: 'MSME & livelihood' },
    ],
  },
  inspector: {
    title: 'Explainable eligibility',
    score: 'Match score',
    eligible: 'Eligible on declared facts',
    partial: 'Partial — a document or field is still open',
    ineligible: 'Not eligible on current facts',
    close: 'Close',
    remediation: 'What would unlock this',
  },
  locker: {
    eyebrow: 'Document locker',
    title: 'OCR in the browser. Nothing leaves this device.',
    lede: 'Drop Aadhaar, ration or land records. We never store raw national identity digits.',
    privacy: 'Processed locally in browser memory · DPDP 2023',
    drop: 'Drop PDF or image, or browse',
    scanning: 'Reading layout…',
    extracted: 'Structured preview (self-declared)',
    bulkTitle: 'CSC bulk intake',
    bulkHint: 'Queue dossiers for the kiosk printer. Citizen records stay on this desk until synced.',
    queue: 'Dossier queue',
  },
  about: {
    eyebrow: 'Why this exists',
    title: 'Government information is public. Understanding it should be too.',
    lede: 'NitiDrishti is a civic engine: we collect from official pages, PDFs and gazettes, version every change, and decide eligibility with mathematics — then show the source.',
    chapters: [
      { kicker: '01  Collect', title: 'Own pipeline, official sources', body: 'HTML, JavaScript portals, gazette PDFs, scans, CSV. No rented scheme API. Restricted platforms only when the law requires an official assertion.' },
      { kicker: '02  Decide', title: 'Rules, not hallucinations', body: 'AI may extract a clause. A deterministic AST says eligible, partial or ineligible — with the inequality that failed.' },
      { kicker: '03  Protect', title: 'Guest mode is empty on the server', body: 'Zero-PII until consent. Right to forget wipes the profile. Raw Aadhaar digits are never a column.' },
      { kicker: '04  Deliver', title: 'Five desks, one truth', body: 'Citizen, CSC kiosk, Nyay-Mitra, welfare command, PostGIS analytics — same schemes, different jobs.' },
    ],
  },
  architecture: {
    eyebrow: 'Three desks. One pipeline.',
    title: 'Architecture for the three people existing systems left behind',
    lede: 'Existing systems left three people behind. Each card is their desk — with that desk’s engines drawn inside it, not a brochure of features.',
    principleLabel: 'Key principle.',
    principle:
      'AI understands the document. Validated rules and official source evidence control the final decision. A language model never casts the eligibility vote.',
    cards: [
      {
        id: 'citizen',
        kicker: '01  Nagrik desk',
        name: 'Rural & semi-urban citizens',
        audience: 'Deserving beneficiaries',
        problem:
          'Tehsil and CSC rounds with no idea why a form died. Dalberg / IDinsight: 30–42% of otherwise eligible applications fail at the counter on document format — with no pre-warning.',
        pipelineLabel: 'Architecture inside this desk',
        pipeline: [
          'Live profile stays on this device',
          'Application Readiness Engine (0–100%)',
          'Deterministic AST + XAI print',
          'What-If sensitivity optimiser',
          'Welfare Maximizer — non-conflicting stack',
          'One-click Action Dossier',
        ],
        engines: ['Readiness checker', 'AST compiler', 'What-If optimiser', 'Cross-stacking solver'],
        printLabel: 'How the engine prints (sample evaluation, not live data)',
        print: [
          { state: 'pass', text: 'Age ≥ 60 (applicant age: 62)' },
          { state: 'fail', text: 'Annual income ≤ ₹2,00,000 (actual: ₹2,35,000 | Δ ₹35,000 excess)' },
        ],
        cta: 'Open citizen cockpit',
        href: '/citizen',
      },
      {
        id: 'csc',
        kicker: '02  Village kendra',
        name: 'CSC kiosk operators',
        audience: 'Village Level Entrepreneurs',
        problem:
          'Slow internet, server crashes, and fifty government portals. TRAI rural connectivity: a cloud-only desk dies when the link drops. The operator still has a queue.',
        pipelineLabel: 'Architecture inside this desk',
        pipeline: [
          'Offline-first PWA shell',
          'IndexedDB rule catalog',
          'Local AST compute (< 2 ms)',
          'Five-step assisted intake',
          'Printable verified audit slip',
        ],
        engines: ['Service worker', 'IndexedDB', 'Local AST', 'Monochrome print'],
        flowLabel: 'CSC intake',
        flow: ['Citizen profile', 'Find opportunity', 'Check eligibility', 'Documents', 'Action Dossier'],
        cta: 'Open CSC desk',
        href: '/csc',
      },
      {
        id: 'district',
        kicker: '03  District command',
        name: 'Welfare officers & policy makers',
        audience: 'Nyay-Mitra · Welfare · Analytics',
        problem:
          'No live tool to see which tehsil is losing forms on which document. Gazette slabs change monthly; manual portal updates lag 3–6 months (DARPG).',
        pipelineLabel: 'Architecture inside this desk',
        pipeline: [
          'Official gazette PDF in',
          'SHA-256 snapshot (never overwrite)',
          'NLP → structured JSON rules',
          'Old vs new circular diff',
          'Application survival funnel',
          'PostGIS district heatmap',
        ],
        engines: ['Nyay-Mitra parser', 'Version ledger', 'Funnel', 'PostGIS'],
        printLabel: 'Sample circular delta (not a live gazette)',
        print: [{ state: 'delta', text: 'Max income: ₹2,50,000 → ₹2,00,000 (strict cap change)' }],
        cta: 'Open Nyay-Mitra',
        href: '/nyay-mitra',
        also: [
          { label: 'Welfare', href: '/welfare' },
          { label: 'Analytics', href: '/analytics' },
        ],
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently Asked Questions',
    more: 'View More',
    less: 'Show fewer',
    items: [
      {
        q: 'How does the explainable eligibility engine work?',
        a: 'Each scheme carries structured rules (AND / OR, age, income, category, land). The engine evaluates them in order and prints pass, fail or unknown. A language model never casts the final vote.',
      },
      {
        q: 'Can I use NitiDrishti with low or zero internet?',
        a: 'Yes. The PWA caches the shell and the rule catalog in IndexedDB / Cache Storage. The offline pill turns amber and eligibility still runs on-device. Sync resumes when the network returns.',
      },
      {
        q: 'Is my Aadhaar or income uploaded to cloud servers?',
        a: 'Guest mode writes zero server rows. Document OCR runs in browser memory. We never store raw national ID digits. A consented citizen profile is kept only after an explicit DPDP toggle (Phase 4).',
      },
      {
        q: 'How do CSC Village Level Entrepreneurs process bulk applications?',
        a: 'Switch the header to Kendra / CSC Agent. Bulk upload and the dossier queue appear. Intake is a five-step desk flow designed to finish in under two minutes, with a print-optimised sheet.',
      },
      {
        q: 'How do I download an application-ready PDF dossier?',
        a: 'Save schemes, then trigger “Save to dossier”. The Action Dossier (Phase 11) is a monochrome A4 with scheme facts, checklist, gazette hash and helpline. Until that worker is live, the queue holds the request on this device.',
      },
      {
        q: 'Where does scheme data come from?',
        a: 'Our connectors read official government sites and documents. Third-party or paid data APIs are not used. Every card is meant to carry source URL and last-verified time once ingestion is on.',
      },
      {
        q: 'What is SIH260092 doing inside this product?',
        a: 'The citizen cockpit is anchored on marginalized entrepreneurship — weavers, potters, street vendors, SHGs and students — with welfare, scholarships and enterprise credit on the same rule engine.',
      },
      {
        q: 'Does voice work in Hindi?',
        a: 'The mic uses the browser Speech API with hi-IN when Hindi is selected. If the browser has no recogniser, we show an honest fallback instead of faking a cloud transcript.',
      },
      {
        q: 'Who can see the analytics map?',
        a: 'Welfare and analyst roles. District polygons come from PostGIS, not dummy pins. Saturation numbers are queries, not marketing copy.',
      },
      {
        q: 'How do I delete my data?',
        a: 'Sign out clears the device session and scroll-resets. The statutory Right to Forget is DELETE /api/v1/profile/purge once accounts are live — it must hard-delete consented rows.',
      },
    ],
  },
  footer: {
    product: 'Product',
    legal: 'Stewardship',
    contact: 'Contact',
    grievance: 'Grievance: institute project desk · Session 2026–27',
    attributions: 'Scheme names and benefit ceilings are public official facts. Always re-verify on the source gazette before applying.',
    diagnostics: 'System probe',
    latency: 'API probe',
    env: 'Environment',
    links: [
      { label: 'Citizen cockpit', href: '/citizen' },
      { label: 'CSC desk', href: '/csc' },
      { label: 'Nyay-Mitra', href: '/nyay-mitra' },
      { label: 'Welfare command', href: '/welfare' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  auth: {
    title: 'Enter NitiDrishti',
    guest: 'Continue as guest',
    guestHint: 'Zero server footprint. 0-PII session on this browser only.',
    citizen: 'Citizen',
    csc: 'CSC operator',
    name: 'Display name (optional, not an ID)',
    continue: 'Continue',
    note: 'JWT + DPDP purge ship in Phase 4. Until then this session stays on the device.',
  },
  pwa: {
    install: 'Install app',
    online: 'Online',
    offline: 'Offline engine active',
    worker: 'Service worker',
  },
};

const hi: HomeCopy = {
  a11y: {
    font: 'अक्षर आकार',
    contrastDefault: 'सामान्य',
    contrastHigh: 'उच्च कंट्रास्ट',
    language: 'भाषा',
    audioPreview: 'हिन्दी संकेत सुनें',
    skipToContent: 'सीधे सामग्री पर जाएँ',
  },
  nav: {
    about: 'परिचय',
    schemes: 'योजनाएँ',
    walkthrough: 'वॉकथ्रू',
    faq: 'प्रश्न',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    guest: 'अतिथि · 0-PII',
  },
  role: {
    citizen: 'नागरिक / लाभार्थी',
    csc: 'केंद्र / CSC एजेंट',
  },
  hero: {
    walkthroughCta: '90 सेकंड का प्लेटफ़ॉर्म फ़िल्म देखें',
    slides: [
      {
        kicker: 'कृषि वितरण',
        title: 'किसान का हक, नियम की छपाई।',
        body: 'प्रत्यक्ष आय सहायता और फसल कवर इसी डिवाइस पर — पास या फेल राजपत्र असमानता से, चैटबॉट अनुमान से नहीं।',
      },
      {
        kicker: 'महिला एवं समूह',
        title: 'एसएचजी ऋण और मातृत्व डीबीटी एक डेस्क पर।',
        body: 'ग्रामीण महिलाओं को पाँच पोर्टल नहीं चाहिए। वही AST अधिसूचित महिला-बाल योजनाएँ जोड़ता है।',
      },
      {
        kicker: 'उच्च शिक्षा',
        title: 'छात्रवृत्ति जो आय सीमा दिखाए।',
        body: 'पोस्ट-मैट्रिक अनुदान अधिसूचित छत लेकर चलते हैं। फेल पर सटीक कमी — What-If, नारा नहीं।',
      },
      {
        kicker: 'कारीगर एवं आजीविका',
        title: 'पीएम विश्वकर्मा और MSME ऋण, कानूनी स्टैक।',
        body: 'पारंपरिक व्यापार के अधिसूचित स्लैब। प्रतिस्पर्धी योजनाएँ चिह्नित; इंजन ऋण गढ़ता नहीं।',
      },
      {
        kicker: 'तहसील एवं स्वास्थ्य',
        title: 'अस्पताल कवर, फ़ाइल विक्रेता के पास नहीं।',
        body: 'आयुष्मान-वर्ग पात्रता संरचित नियम रहती है। प्रमाण-पत्र की फ़ोटो कच्चे पहचान अंक के रूप में ब्राउज़र से बाहर नहीं जाती।',
      },
    ],
  },
  walkthrough: {
    eyebrow: '90 सेकंड',
    title: 'देखें NitiDrishti कैसे काम करता है',
    play: '90 सेकंड का प्लेटफ़ॉर्म फ़िल्म देखें',
    close: 'बंद करें',
    captions: 'कैप्शन',
    steps: [
      {
        title: 'एजेंडा: सही योजना, सही नागरिक, सही नियम',
        body: 'NitiDrishti + SIH260092 एक नागरिक इंजन है। यह आधिकारिक कल्याण, छात्रवृत्ति और उद्यम ऋण इकट्ठा करता है, फिर किसान, एसएचजी महिला, विद्यार्थी, कारीगर को बताता है वे किसके पात्र हैं — और क्यों।',
      },
      {
        title: 'डेटा हम स्वयं एकत्र करते हैं — किराए पर नहीं',
        body: 'सरकारी डोमेन से HTML, जावास्क्रिप्ट पोर्टल, राजपत्र PDF, स्कैन और CSV। कोई पेड स्कीम API नहीं। प्रतिबंधित प्लेटफ़ॉर्म केवल जब कानून आधिकारिक प्रमाण माँगता है।',
      },
      {
        title: 'पाँच डेस्क। एक सत्य।',
        body: 'नागरिक कॉकपिट, CSC कियोस्क, न्याय-मित्र राजपत्र इंटेलिजेंस, कल्याण कमांड, और PostGIS ज़िला एनालिटिक्स। वही योजनाएँ। वितरण श्रृंखला में अलग काम।',
      },
      {
        title: 'पात्रता गणित है, चैटबॉट नहीं',
        body: 'AST नियम इंजन आयु, आय, भूमि, श्रेणी को पास या फेल करता है। भाषा मॉडल खंड निकाल सकता है। अंतिम वोट वह नहीं डालता। हर फेल पर सटीक कमी दिखती है।',
      },
      {
        title: 'अतिथि मोड सर्वर पर शून्य पंक्ति छोड़ता है',
        body: 'DPDP 2023: किसी कॉलम में कच्चे आधार अंक नहीं। प्रोफ़ाइल रखने से पहले सहमति। मिटाने का अधिकार। OCR के कागज़ ब्राउज़र मेमोरी में रहते हैं।',
      },
      {
        title: 'मिलान से प्रिंट-योग्य एक्शन डोज़ियर तक',
        body: 'योजना सहेजें, मोनोक्रोम A4 डाउनलोड करें: सूची, राजपत्र हैश, हेल्पलाइन। ऑफ़लाइन PWA गाँव के केंद्र में नेटवर्क गिरने पर भी नियम इंजन चलाता है।',
      },
    ],
  },
  schemes: {
    eyebrow: 'निर्देशिका',
    title: 'योजना इंटेलिजेंस, ब्रोशर नहीं',
    lede: 'जीवन-स्थिति से छँटाई। पात्रता इसी डिवाइस पर सक्रिय नियमों से गिनी जाती है।',
    search: 'योजना खोजें',
    income: 'वार्षिक आय',
    caste: 'श्रेणी',
    state: 'राज्य / केंद्र शासित',
    allStates: 'अखिल भारतीय / कोई भी राज्य',
    check: 'पात्रता जाँचें',
    explain: 'तर्क समझाएँ',
    save: 'डोज़ियर में सहेजें',
    saved: 'सहेजा गया',
    empty: 'इन फ़िल्टर से कोई योजना नहीं मिली।',
    live: 'API से लाइव',
    catalog: 'आधिकारिक कैटलॉग (API तैयार हो रही है)',
    filters: [
      { id: 'all', label: 'सभी योजनाएँ' },
      { id: 'agriculture', label: 'कृषि एवं allied' },
      { id: 'women', label: 'महिला एवं बाल' },
      { id: 'education', label: 'शिक्षा एवं कौशल' },
      { id: 'health', label: 'स्वास्थ्य एवं वरिष्ठ' },
      { id: 'msme', label: 'एमएसएमई एवं आजीविका' },
    ],
  },
  inspector: {
    title: 'समझ में आने वाली पात्रता',
    score: 'मिलान अंक',
    eligible: 'घोषित तथ्यों पर पात्र',
    partial: 'आंशिक — कोई फ़ील्ड अभी खुला है',
    ineligible: 'वर्तमान तथ्यों पर पात्र नहीं',
    close: 'बंद करें',
    remediation: 'क्या खोल सकता है',
  },
  locker: {
    eyebrow: 'दस्तावेज़ लॉकर',
    title: 'OCR ब्राउज़र में। कुछ सर्वर पर नहीं जाता।',
    lede: 'आधार, राशन या भूमि रिकॉर्ड छोड़ें। कच्चे पहचान अंक कभी संग्रहीत नहीं होते।',
    privacy: 'केवल ब्राउज़र मेमोरी · DPDP 2023',
    drop: 'PDF या छवि छोड़ें, या चुनें',
    scanning: 'लेआउट पढ़ा जा रहा है…',
    extracted: 'संरचित पूर्वावलोकन (स्व-घोषित)',
    bulkTitle: 'CSC बल्क इनटेक',
    bulkHint: 'कियोस्क प्रिंटर के लिए डोज़ियर कतार। सिंक तक रिकॉर्ड इसी डेस्क पर।',
    queue: 'डोज़ियर कतार',
  },
  about: {
    eyebrow: 'यह क्यों है',
    title: 'सरकारी जानकारी सार्वजनिक है। उसे समझना भी होना चाहिए।',
    lede: 'NitiDrishti एक नागरिक इंजन है: आधिकारिक पृष्ठ, PDF और राजपत्र से संग्रह, हर बदलाव का संस्करण, और गणित से पात्रता — फिर स्रोत दिखाता है।',
    chapters: [
      { kicker: '01  संग्रह', title: 'अपनी पाइपलाइन, आधिकारिक स्रोत', body: 'HTML, जावास्क्रिप्ट पोर्टल, राजपत्र PDF, स्कैन, CSV। किराए की स्कीम API नहीं।' },
      { kicker: '02  निर्णय', title: 'नियम, भ्रम नहीं', body: 'AI खंड निकाल सकता है। पात्र/आंशिक/अपात्र AST बताता है।' },
      { kicker: '03  सुरक्षा', title: 'अतिथि मोड सर्वर पर खाली', body: 'सहमति तक शून्य PII। आधार अंक कभी कॉलम नहीं।' },
      { kicker: '04  वितरण', title: 'पाँच डेस्क, एक सत्य', body: 'नागरिक, CSC, न्याय-मित्र, कल्याण कमांड, PostGIS — वही योजनाएँ, अलग काम।' },
    ],
  },
  architecture: {
    eyebrow: 'तीन डेस्क। एक पाइपलाइन।',
    title: 'उन तीन लोगों की वास्तुकला जिन्हें मौजूदा सिस्टम ने छोड़ दिया',
    lede: 'मौजूदा सिस्टम ने तीन लोगों को छोड़ दिया। हर कार्ड उनकी डेस्क है — उसके इंजन उसी कार्ड के अंदर खींचे गए हैं, फीचर सूची नहीं।',
    principleLabel: 'मूल सिद्धांत।',
    principle:
      'AI दस्तावेज़ समझता है। अंतिम निर्णय मान्य नियम और आधिकारिक स्रोत साक्ष्य करते हैं। पात्रता पर भाषा मॉडल वोट नहीं डालता।',
    cards: [
      {
        id: 'citizen',
        kicker: '01  नागरिक डेस्क',
        name: 'ग्रामीण और अर्ध-शहरी नागरिक',
        audience: 'हक़दार लाभार्थी',
        problem:
          'तहसील और CSC के चक्कर, बिना यह जाने फॉर्म क्यों मरा। Dalberg / IDinsight: 30–42% पात्र आवेदन दस्तावेज़ प्रारूप पर काउंटर पर गिरते हैं — कोई पूर्व चेतावनी नहीं।',
        pipelineLabel: 'इस डेस्क के अंदर की वास्तुकला',
        pipeline: [
          'जीवित प्रोफ़ाइल इसी डिवाइस पर',
          'आवेदन-तैयारी इंजन (0–100%)',
          'नियतात्मक AST + XAI प्रिंट',
          'What-If संवेदनशीलता ऑप्टिमाइज़र',
          'कल्याण मैक्सिमाइज़र — गैर-संघर्षी स्टैक',
          'एक-क्लिक एक्शन डोज़ियर',
        ],
        engines: ['तैयारी जाँच', 'AST कंपाइलर', 'What-If', 'क्रॉस-स्टैकिंग'],
        printLabel: 'इंजन ऐसे छापता है (नमूना मूल्यांकन, लाइव डेटा नहीं)',
        print: [
          { state: 'pass', text: 'आयु ≥ 60 (आवेदक आयु: 62)' },
          { state: 'fail', text: 'वार्षिक आय ≤ ₹2,00,000 (वास्तविक: ₹2,35,000 | Δ ₹35,000 अधिक)' },
        ],
        cta: 'नागरिक कॉकपिट खोलें',
        href: '/citizen',
      },
      {
        id: 'csc',
        kicker: '02  ग्राम केंद्र',
        name: 'CSC कियोस्क संचालक',
        audience: 'ग्राम स्तरीय उद्यमी',
        problem:
          'धीमा इंटरनेट, सर्वर क्रैश, पचास सरकारी पोर्टल। TRAI ग्रामीण कनेक्टिविटी: केवल-क्लाउड डेस्क लिंक गिरते ही मर जाता है। कतार फिर भी लगी रहती है।',
        pipelineLabel: 'इस डेस्क के अंदर की वास्तुकला',
        pipeline: [
          'ऑफ़लाइन-फर्स्ट PWA शेल',
          'IndexedDB नियम कैटलॉग',
          'लोकल AST गणना (< 2 ms)',
          'पाँच-चरणीय सहायता इनटेक',
          'प्रिंट-योग्य सत्यापित ऑडिट पर्ची',
        ],
        engines: ['सर्विस वर्कर', 'IndexedDB', 'लोकल AST', 'मोनोक्रोम प्रिंट'],
        flowLabel: 'CSC इनटेक',
        flow: ['नागरिक प्रोफ़ाइल', 'अवसर खोज', 'पात्रता जाँच', 'दस्तावेज़', 'एक्शन डोज़ियर'],
        cta: 'CSC डेस्क खोलें',
        href: '/csc',
      },
      {
        id: 'district',
        kicker: '03  ज़िला कमांड',
        name: 'कल्याण अधिकारी और नीति निर्माता',
        audience: 'न्याय-मित्र · कल्याण · एनालिटिक्स',
        problem:
          'यह देखने का कोई लाइव उपकरण नहीं कि किस तहसील में कौन सा कागज़ फॉर्म गिरा रहा है। राजपत्र स्लैब महीने-महीने बदलते हैं; पोर्टल अपडेट 3–6 महीने पीछे (DARPG)।',
        pipelineLabel: 'इस डेस्क के अंदर की वास्तुकला',
        pipeline: [
          'आधिकारिक राजपत्र PDF अंदर',
          'SHA-256 स्नैपशॉट (ओवरराइट नहीं)',
          'NLP → संरचित JSON नियम',
          'पुराना बनाम नया परिपत्र अंतर',
          'आवेदन सर्वाइवल फ़नल',
          'PostGIS ज़िला हीटमैप',
        ],
        engines: ['न्याय-मित्र पार्सर', 'संस्करण लेजर', 'फ़नल', 'PostGIS'],
        printLabel: 'नमूना परिपत्र अंतर (लाइव राजपत्र नहीं)',
        print: [{ state: 'delta', text: 'अधिकतम आय: ₹2,50,000 → ₹2,00,000 (कठोर सीमा परिवर्तन)' }],
        cta: 'न्याय-मित्र खोलें',
        href: '/nyay-mitra',
        also: [
          { label: 'कल्याण', href: '/welfare' },
          { label: 'एनालिटिक्स', href: '/analytics' },
        ],
      },
    ],
  },
  faq: {
    eyebrow: 'प्रश्न',
    title: 'अक्सर पूछे जाने वाले प्रश्न',
    more: 'View More',
    less: 'कम दिखाएँ',
    items: [
      { q: 'समझ में आने वाला पात्रता इंजन कैसे काम करता है?', a: 'हर योजना पर संरचित नियम होते हैं। इंजन क्रम से पास, फेल या अज्ञात छापता है। अंतिम निर्णय भाषा मॉडल नहीं करता।' },
      { q: 'कम या शून्य इंटरनेट पर NitiDrishti चलेगा?', a: 'हाँ। PWA शेल और नियम कैटलॉग कैश करता है। ऑफ़लाइन पिल एम्बर होता है और पात्रता डिवाइस पर चलती है।' },
      { q: 'क्या आधार या आय क्लाउड पर जाती है?', a: 'अतिथि मोड सर्वर पर शून्य पंक्ति लिखता है। OCR ब्राउज़र मेमोरी में है। कच्चे पहचान अंक कभी नहीं रखे जाते।' },
      { q: 'CSC उद्यमी बल्क आवेदन कैसे लें?', a: 'हेडर को केंद्र / CSC एजेंट पर लाएँ। बल्क अपलोड और डोज़ियर कतार दिखती है। पाँच-चरणीय डेस्क दो मिनट से कम में।' },
      { q: 'आवेदन-तैयार PDF डोज़ियर कैसे डाउनलोड करूँ?', a: 'योजना सहेजें, फिर डोज़ियर में भेजें। एक्शन डोज़ियर मोनोक्रोम A4 है। वर्कर आने तक कतार इस डिवाइस पर रहती है।' },
      { q: 'योजना डेटा कहाँ से आता है?', a: 'कनेक्टर आधिकारिक सरकारी साइट और दस्तावेज़ पढ़ते हैं। तीसरे पक्ष की पेड डेटा API नहीं।' },
      { q: 'SIH260092 इस उत्पाद में क्या है?', a: 'नागरिक कॉकपिट हाशिये के उद्यमियों — बुनकर, कुम्हार, स्ट्रीट वेंडर, एसएचजी, विद्यार्थी — पर टिका है।' },
      { q: 'क्या वॉयस हिंदी में चलता है?', a: 'माइक ब्राउज़र Speech API पर hi-IN इस्तेमाल करता है। पहचान न हो तो ईमानदार फ़ॉलबैक दिखता है।' },
      { q: 'एनालिटिक्स नक्शा कौन देखे?', a: 'कल्याण और विश्लेषक भूमिकाएँ। ज़िला पॉलीगॉन PostGIS से आते हैं, डमी पिन से नहीं।' },
      { q: 'अपना डेटा कैसे मिटाऊँ?', a: 'साइन आउट डिवाइस सत्र साफ़ करता है। Right to Forget: DELETE /api/v1/profile/purge — सहमति वाली पंक्तियाँ हार्ड-डिलीट।' },
    ],
  },
  footer: {
    product: 'उत्पाद',
    legal: 'जिम्मेदारी',
    contact: 'संपर्क',
    grievance: 'शिकायत: संस्थान परियोजना डेस्क · सत्र 2026–27',
    attributions: 'योजना नाम और लाभ सार्वजनिक आधिकारिक तथ्य हैं। आवेदन से पहले राजपत्र पर पुनः जाँचें।',
    diagnostics: 'सिस्टम जाँच',
    latency: 'API जाँच',
    env: 'पर्यावरण',
    links: [
      { label: 'नागरिक कॉकपिट', href: '/citizen' },
      { label: 'CSC डेस्क', href: '/csc' },
      { label: 'न्याय-मित्र', href: '/nyay-mitra' },
      { label: 'कल्याण कमांड', href: '/welfare' },
      { label: 'एनालिटिक्स', href: '/analytics' },
    ],
  },
  auth: {
    title: 'NitiDrishti में प्रवेश',
    guest: 'अतिथि के रूप में जारी रखें',
    guestHint: 'सर्वर पर शून्य छाप। केवल इस ब्राउज़र पर 0-PII सत्र।',
    citizen: 'नागरिक',
    csc: 'CSC संचालक',
    name: 'प्रदर्शित नाम (वैकल्पिक, पहचान नहीं)',
    continue: 'आगे बढ़ें',
    note: 'JWT और DPDP purge फेज़ 4 में। तब तक सत्र डिवाइस पर रहता है।',
  },
  pwa: {
    install: 'ऐप स्थापित करें',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन इंजन सक्रिय',
    worker: 'सर्विस वर्कर',
  },
};

export const HOME_COPY: Record<Locale, HomeCopy> = { en, hi };
