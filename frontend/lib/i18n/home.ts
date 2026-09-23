import { CIVIC_SECTORS } from '@/lib/civic/sectors';
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
    emptyCatalog: string;
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
    disclaimer: string;
    version: string;
    asOf: string;
    asOfCurrent: string;
    source: string;
    effective: string;
    conflicts: string;
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
    resources: string;
    legal: string;
    contact: string;
    purpose: string;
    help: string;
    faqs: string;
    privacy: string;
    terms: string;
    emailLabel: string;
    email: string;
    projectLabel: string;
    languageNote: string;
    attributions: string;
    links: readonly { label: string; href: string }[];
  };
  auth: {
    title: string;
    guest: string;
    guestHint: string;
    citizen: string;
    csc: string;
    officer: string;
    name: string;
    email: string;
    password: string;
    continue: string;
    note: string;
    officerHint: string;
    missingCredentials: string;
    failed: string;
    forget: string;
    forgetHint: string;
    forgetBusy: string;
    consent: string;
    consentGuest: string;
    consentOn: string;
    consentOff: string;
    consentBusy: string;
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
        body: 'NitiDrishti is a civic engine. It collects official welfare, scholarships and enterprise credit, then tells each person — farmer, SHG woman, student, artisan — what they qualify for, and why.',
      },
      {
        title: 'Data we collect ourselves — not rent',
        body: 'HTML pages, JavaScript portals, gazette text PDFs and CSV from government domains. Scanned gazettes use local Tesseract when the flag is on and the binary exists. No paid scheme API.',
      },
      {
        title: 'Five desks. One truth.',
        body: 'Citizen cockpit, CSC kiosk, Nyay-Mitra gazette intelligence, welfare command, and district analytics (TopoJSON map). Same schemes. Different jobs in the delivery chain.',
      },
      {
        title: 'Eligibility is mathematics, not a chatbot',
        body: 'An AST rule engine passes or fails age, income, land, category. A language model may extract a clause. It never casts the final vote. Every fail shows the exact shortfall.',
      },
      {
        title: 'Guest mode leaves zero server rows',
        body: 'DPDP 2023: no raw Aadhaar digits in any column. Consent before a profile is kept. Right to forget wipes it. Document files stay in this browser; OCR is not live.',
      },
      {
        title: 'From match to a printable Action Dossier',
        body: 'Save a scheme, download a monochrome A4: checklist, gazette hash, helpline. CSC can hold a dossier queue in IndexedDB. A catalog snapshot from the last successful fetch may be readable offline; eligibility still needs the API.',
      },
    ],
  },
  schemes: {
    eyebrow: 'Directory',
    title: 'Scheme intelligence, not a brochure wall',
    lede: 'Filter by life-situation. Eligibility is computed against the active rule set on declared facts — not a department approval.',
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
    emptyCatalog: 'No data from official sources yet. Check back after the next refresh.',
    live: 'Live from API',
    catalog: 'Official catalog',
    filters: [
      { id: 'all', label: 'All schemes' },
      ...CIVIC_SECTORS.map((sector) => ({ id: sector.category, label: sector.nameEn })),
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
    disclaimer: 'Assessment on declared facts — not a government sanction or DBT.',
    version: 'Version',
    asOf: 'As on',
    asOfCurrent: 'current gazette',
    source: 'Source',
    effective: 'Effective',
    conflicts: 'Rule conflict — human review before treating either cap as sole law',
  },
  locker: {
    eyebrow: 'Document locker',
    title: 'Local document vault. Files stay on this device.',
    lede: 'Drop Aadhaar, ration or land records as a self-declared tick. Identity files stay in this browser and are never OCRed on the server. Gazette OCR is a separate officer preview.',
    privacy: 'Processed locally in browser memory · DPDP 2023',
    drop: 'Drop PDF or image, or browse',
    scanning: 'Marking as self-declared…',
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
      { kicker: '01  Collect', title: 'Own pipeline, official sources', body: 'HTML, JavaScript portals, gazette text PDFs, CSV. Scanned gazettes use local Tesseract when FEATURE_AI_EXTRACTION is on and the binary exists — otherwise fail-closed. No rented scheme API.' },
      { kicker: '02  Decide', title: 'Rules, not hallucinations', body: 'AI may extract a clause. A deterministic AST says eligible, partial or ineligible — with the inequality that failed.' },
      { kicker: '03  Protect', title: 'Guest mode is empty on the server', body: 'Zero-PII until consent. Right to forget wipes the profile. Raw Aadhaar digits are never a column.' },
      { kicker: '04  Deliver', title: 'Five desks, one truth', body: 'Citizen, CSC kiosk, Nyay-Mitra, welfare command, district analytics — same schemes, different jobs.' },
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
          'IndexedDB kiosk queue',
          'Local dossier queue (this device)',
          'Local AST preview (no timing claim)',
          'Five-step assisted intake',
          'Printable verified audit slip',
        ],
        engines: ['IndexedDB', 'Local AST', 'Monochrome print'],
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
          'Clause extract → human review → AST',
          'Old vs new circular diff',
          'Application survival funnel when rows exist',
          'TopoJSON district map',
        ],
        engines: ['Nyay-Mitra parser', 'Version ledger', 'Funnel', 'TopoJSON'],
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
        a: 'Each scheme carries structured rules (AND / OR, age, income, category, land). The engine evaluates them in order and prints pass, fail or unknown. A language model never casts the final vote. A pass is an assessment on declared facts — not a government sanction.',
      },
      {
        q: 'Is a pass on NitiDrishti an official government approval?',
        a: 'No. It is an assessment on facts you declare, against structured rules from official sources. It is not a sanction, DBT, or department decision. Re-verify the gazette and apply through the notified channel.',
      },
      {
        q: 'Can I use NitiDrishti with low or zero internet?',
        a: 'CSC can keep a dossier queue in IndexedDB on this device. When the catalog service worker is registered, the last successful published-scheme fetch may be readable offline. Eligibility still needs the API. The offline pill is not a claim that ingest or identity works offline.',
      },
      {
        q: 'Is my Aadhaar or income uploaded to cloud servers?',
        a: 'Guest mode writes zero server rows. We never store raw national ID digits. Identity files stay in this browser and are not OCRed on the server. Gazette scanned PDFs use local Tesseract (confidence, HITL if low). A consented citizen profile is kept only after the explicit DPDP toggle on /privacy.',
      },
      {
        q: 'How do CSC Village Level Entrepreneurs process bulk applications?',
        a: 'Switch the header to Kendra / CSC Agent. Bulk upload and the dossier queue appear. Intake is a five-step desk flow designed to finish in under two minutes, with a print-optimised sheet.',
      },
      {
        q: 'How do I download an application-ready PDF dossier?',
        a: 'Save schemes, then trigger “Save to dossier”. The Action Dossier is a monochrome A4 with scheme facts, checklist, gazette hash and helpline. Until that worker is live, the queue holds the request on this device.',
      },
      {
        q: 'Where does scheme data come from?',
        a: 'Our connectors read official government sites and documents. Third-party or paid data APIs are not used. Every card is meant to carry source URL and last-verified time once ingestion is on.',
      },
      {
        q: 'Who is NitiDrishti built for?',
        a: 'The citizen desk is anchored on people the delivery chain often misses — weavers, potters, street vendors, SHGs and students — with welfare, scholarships and enterprise credit on the same rule engine.',
      },
      {
        q: 'Does voice work in Hindi?',
        a: 'The mic uses the browser Speech API with hi-IN when Hindi is selected. If the browser has no recogniser, we show an honest fallback instead of faking a cloud transcript.',
      },
      {
        q: 'Who can see the analytics map?',
        a: 'Welfare and analyst roles. District polygons come from bundled TopoJSON, joined by name — not a live PostGIS layer. Saturation numbers are queries, or an honest empty when application rows do not exist.',
      },
      {
        q: 'How do I delete my data?',
        a: 'Sign out clears the device session. Signed-in Right to Forget is DELETE /api/v1/auth/account — it hard-deletes consented rows.',
      },
    ],
  },
  footer: {
    product: 'Product',
    resources: 'Resources',
    legal: 'Legal',
    contact: 'Contact',
    purpose:
      'Welfare and opportunity intelligence from official government sources — schemes, rules, and eligibility you can verify. Prints are assessments, not sanctions. No invented counts.',
    help: 'Help',
    faqs: 'FAQs',
    privacy: 'Privacy',
    terms: 'Terms',
    emailLabel: 'Support',
    email: 'hello@nitidrishti.local',
    projectLabel: 'Platform',
    languageNote: 'English and हिन्दी',
    attributions: 'Scheme names and benefit ceilings are public official facts. Always re-verify on the source gazette before applying.',
    links: [
      { label: 'Citizen', href: '/citizen' },
      { label: 'CSC', href: '/csc' },
      { label: 'Welfare', href: '/welfare' },
      { label: 'Nyay-Mitra', href: '/nyay-mitra' },
      { label: 'Analytics', href: '/analytics' },
    ],
  },
  auth: {
    title: 'Enter NitiDrishti',
    guest: 'Continue as guest',
    guestHint: 'Zero server footprint. 0-PII session on this browser only.',
    citizen: 'Citizen',
    csc: 'CSC operator',
    officer: 'Welfare officer',
    name: 'Display name (optional, not an ID)',
    email: 'Email',
    password: 'Password',
    continue: 'Continue',
    note: 'JWT session on this device. Guest still writes zero server rows.',
    officerHint: 'CSC and officer access is assigned on the server. New accounts are CITIZEN.',
    missingCredentials: 'Email and password are required to sign in. Guest needs neither.',
    failed: 'Could not sign in. Check email and password, or register first.',
    forget: 'Delete this account',
    forgetHint: 'Signed-in Right to Forget: DELETE /api/v1/auth/account. Guest has no server row to erase.',
    forgetBusy: 'Deleting…',
    consent: 'Keep a consented profile on the server (age, income, district — never Aadhaar digits).',
    consentGuest: 'Guest cannot retain a server profile. Sign in first, then use this DPDP toggle.',
    consentOn: 'Server retention on',
    consentOff: 'Server retention off',
    consentBusy: 'Saving consent…',
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
        body: 'NitiDrishti एक नागरिक इंजन है। यह आधिकारिक कल्याण, छात्रवृत्ति और उद्यम ऋण इकट्ठा करता है, फिर किसान, एसएचजी महिला, विद्यार्थी, कारीगर को बताता है वे किसके पात्र हैं — और क्यों।',
      },
      {
        title: 'डेटा हम स्वयं एकत्र करते हैं — किराए पर नहीं',
        body: 'सरकारी डोमेन से HTML, जावास्क्रिप्ट पोर्टल, राजपत्र पाठ PDF और CSV। स्कैन OCR लाइव नहीं। कोई पेड स्कीम API नहीं। प्रतिबंधित प्लेटफ़ॉर्म केवल जब कानून आधिकारिक प्रमाण माँगता है।',
      },
      {
        title: 'पाँच डेस्क। एक सत्य।',
        body: 'नागरिक कॉकपिट, CSC कियोस्क, न्याय-मित्र राजपत्र इंटेलिजेंस, कल्याण कमांड, और ज़िला एनालिटिक्स (TopoJSON नक्शा)। वही योजनाएँ। वितरण श्रृंखला में अलग काम।',
      },
      {
        title: 'पात्रता गणित है, चैटबॉट नहीं',
        body: 'AST नियम इंजन आयु, आय, भूमि, श्रेणी को पास या फेल करता है। भाषा मॉडल खंड निकाल सकता है। अंतिम वोट वह नहीं डालता। हर फेल पर सटीक कमी दिखती है।',
      },
      {
        title: 'अतिथि मोड सर्वर पर शून्य पंक्ति छोड़ता है',
        body: 'DPDP 2023: किसी कॉलम में कच्चे आधार अंक नहीं। प्रोफ़ाइल रखने से पहले सहमति। मिटाने का अधिकार। दस्तावेज़ फ़ाइलें इसी ब्राउज़र में रहती हैं; OCR लाइव नहीं।',
      },
      {
        title: 'मिलान से प्रिंट-योग्य एक्शन डोज़ियर तक',
        body: 'योजना सहेजें, मोनोक्रोम A4 डाउनलोड करें: सूची, राजपत्र हैश, हेल्पलाइन। CSC IndexedDB में डोज़ियर कतार रख सकता है। पिछली सफल कैटलॉग प्राप्ति ऑफ़लाइन पढ़ी जा सकती है; पात्रता के लिए API चाहिए।',
      },
    ],
  },
  schemes: {
    eyebrow: 'निर्देशिका',
    title: 'योजना इंटेलिजेंस, ब्रोशर नहीं',
    lede: 'जीवन-स्थिति से छँटाई। पात्रता घोषित तथ्यों पर सक्रिय नियमों से गिनी जाती है — विभाग की स्वीकृति नहीं।',
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
    emptyCatalog: 'आधिकारिक स्रोतों से अभी कोई डेटा नहीं। अगले रिफ़्रेश के बाद फिर देखें।',
    live: 'API से लाइव',
    catalog: 'आधिकारिक कैटलॉग',
    filters: [
      { id: 'all', label: 'सभी योजनाएँ' },
      ...CIVIC_SECTORS.map((sector) => ({ id: sector.category, label: sector.nameHi })),
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
    disclaimer: 'घोषित तथ्यों पर मूल्यांकन — सरकारी स्वीकृति या डीबीटी नहीं।',
    version: 'संस्करण',
    asOf: 'तिथि',
    asOfCurrent: 'वर्तमान राजपत्र',
    source: 'स्रोत',
    effective: 'प्रभावी',
    conflicts: 'नियम विरोध — किसी एक सीमा को अकेला कानून न मानें, मानव समीक्षा चाहिए',
  },
  locker: {
    eyebrow: 'दस्तावेज़ लॉकर',
    title: 'स्थानीय दस्तावेज़ तिजोरी। फ़ाइलें इसी डिवाइस पर रहती हैं।',
    lede: 'आधार, राशन या भूमि रिकॉर्ड स्व-घोषित टिक। पहचान फ़ाइलें इसी ब्राउज़र में रहती हैं और सर्वर पर OCR नहीं होतीं। राजपत्र OCR अलग अधिकारी पूर्वावलोकन है।',
    privacy: 'केवल ब्राउज़र मेमोरी · DPDP 2023',
    drop: 'PDF या छवि छोड़ें, या चुनें',
    scanning: 'स्व-घोषित चिह्नित…',
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
      { kicker: '01  संग्रह', title: 'अपनी पाइपलाइन, आधिकारिक स्रोत', body: 'HTML, जावास्क्रिप्ट पोर्टल, राजपत्र पाठ PDF, CSV। स्कैन राजपत्र स्थानीय Tesseract से जब फ़्लैग और बाइनरी हों — नहीं तो fail-closed। किराए की स्कीम API नहीं।' },
      { kicker: '02  निर्णय', title: 'नियम, भ्रम नहीं', body: 'AI खंड निकाल सकता है। पात्र/आंशिक/अपात्र AST बताता है।' },
      { kicker: '03  सुरक्षा', title: 'अतिथि मोड सर्वर पर खाली', body: 'सहमति तक शून्य PII। आधार अंक कभी कॉलम नहीं।' },
      { kicker: '04  वितरण', title: 'पाँच डेस्क, एक सत्य', body: 'नागरिक, CSC, न्याय-मित्र, कल्याण कमांड, ज़िला एनालिटिक्स — वही योजनाएँ, अलग काम।' },
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
          'IndexedDB कियोस्क कतार',
          'स्थानीय डोज़ियर कतार (इसी डिवाइस पर)',
          'लोकल AST पूर्वावलोकन (समय का दावा नहीं)',
          'पाँच-चरणीय सहायता इनटेक',
          'प्रिंट-योग्य सत्यापित ऑडिट पर्ची',
        ],
        engines: ['IndexedDB', 'लोकल AST', 'मोनोक्रोम प्रिंट'],
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
          'क्लॉज़ निष्कर्षण → मानव समीक्षा → AST',
          'पुराना बनाम नया परिपत्र अंतर',
          'आवेदन सर्वाइवल फ़नल जब पंक्तियाँ हों',
          'TopoJSON ज़िला नक्शा',
        ],
        engines: ['न्याय-मित्र पार्सर', 'संस्करण लेजर', 'फ़नल', 'TopoJSON'],
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
      { q: 'समझ में आने वाला पात्रता इंजन कैसे काम करता है?', a: 'हर योजना पर संरचित नियम होते हैं। इंजन क्रम से पास, फेल या अज्ञात छापता है। अंतिम निर्णय भाषा मॉडल नहीं करता। पास घोषित तथ्यों पर मूल्यांकन है — सरकारी स्वीकृति नहीं।' },
      { q: 'क्या NitiDrishti पर पास सरकारी स्वीकृति है?', a: 'नहीं। यह आपके घोषित तथ्यों पर, आधिकारिक स्रोतों के संरचित नियमों से, एक मूल्यांकन है। स्वीकृति, डीबीटी या विभाग का निर्णय नहीं। आवेदन से पहले राजपत्र जाँचें।' },
      { q: 'कम या शून्य इंटरनेट पर NitiDrishti चलेगा?', a: 'CSC इस डिवाइस पर IndexedDB में डोज़ियर कतार रख सकता है। सर्विस वर्कर पंजीकृत हो तो पिछली सफल प्रकाशित-योजना प्राप्ति ऑफ़लाइन पढ़ी जा सकती है। पात्रता के लिए API चाहिए। ingest या पहचान ऑफ़लाइन नहीं चलते।' },
      { q: 'क्या आधार या आय क्लाउड पर जाती है?', a: 'अतिथि मोड सर्वर पर शून्य पंक्ति लिखता है। कच्चे पहचान अंक कभी नहीं रखे जाते। दस्तावेज़ फ़ाइलें इसी ब्राउज़र में रहती हैं; OCR लाइव नहीं। सहमति वाली प्रोफ़ाइल केवल /privacy पर DPDP टॉगल के बाद रखी जाती है।' },
      { q: 'CSC उद्यमी बल्क आवेदन कैसे लें?', a: 'हेडर को केंद्र / CSC एजेंट पर लाएँ। बल्क अपलोड और डोज़ियर कतार दिखती है। पाँच-चरणीय डेस्क दो मिनट से कम में।' },
      { q: 'आवेदन-तैयार PDF डोज़ियर कैसे डाउनलोड करूँ?', a: 'योजना सहेजें, फिर डोज़ियर में भेजें। एक्शन डोज़ियर मोनोक्रोम A4 है। वर्कर आने तक कतार इस डिवाइस पर रहती है।' },
      { q: 'योजना डेटा कहाँ से आता है?', a: 'कनेक्टर आधिकारिक सरकारी साइट और दस्तावेज़ पढ़ते हैं। तीसरे पक्ष की पेड डेटा API नहीं।' },
      { q: 'NitiDrishti किसके लिए है?', a: 'नागरिक डेस्क हाशिये के उद्यमियों — बुनकर, कुम्हार, स्ट्रीट वेंडर, एसएचजी, विद्यार्थी — पर टिका है।' },
      { q: 'क्या वॉयस हिंदी में चलता है?', a: 'माइक ब्राउज़र Speech API पर hi-IN इस्तेमाल करता है। पहचान न हो तो ईमानदार फ़ॉलबैक दिखता है।' },
      { q: 'एनालिटिक्स नक्शा कौन देखे?', a: 'कल्याण और विश्लेषक भूमिकाएँ। ज़िला पॉलीगॉन बंडल TopoJSON से नाम-जोड़ से आते हैं — लाइव PostGIS परत नहीं।' },
      { q: 'अपना डेटा कैसे मिटाऊँ?', a: 'साइन आउट डिवाइस सत्र साफ़ करता है। Right to Forget: DELETE /api/v1/auth/account — सहमति वाली पंक्तियाँ हार्ड-डिलीट।' },
    ],
  },
  footer: {
    product: 'उत्पाद',
    resources: 'संसाधन',
    legal: 'कानूनी',
    contact: 'संपर्क',
    purpose:
      'आधिकारिक सरकारी स्रोतों से कल्याण और अवसर की जानकारी — योजनाएँ, नियम, और पात्रता जिन्हें जाँचा जा सके। प्रिंट मूल्यांकन है, स्वीकृति नहीं। काल्पनिक आँकड़े नहीं।',
    help: 'सहायता',
    faqs: 'प्रश्न',
    privacy: 'गोपनीयता',
    terms: 'नियम',
    emailLabel: 'सहायता',
    email: 'hello@nitidrishti.local',
    projectLabel: 'प्लेटफ़ॉर्म',
    languageNote: 'अंग्रेज़ी और हिन्दी',
    attributions: 'योजना नाम और लाभ सार्वजनिक आधिकारिक तथ्य हैं। आवेदन से पहले राजपत्र पर पुनः जाँचें।',
    links: [
      { label: 'नागरिक', href: '/citizen' },
      { label: 'CSC', href: '/csc' },
      { label: 'कल्याण', href: '/welfare' },
      { label: 'न्याय-मित्र', href: '/nyay-mitra' },
      { label: 'एनालिटिक्स', href: '/analytics' },
    ],
  },
  auth: {
    title: 'NitiDrishti में प्रवेश',
    guest: 'अतिथि के रूप में जारी रखें',
    guestHint: 'सर्वर पर शून्य छाप। केवल इस ब्राउज़र पर 0-PII सत्र।',
    citizen: 'नागरिक',
    csc: 'CSC संचालक',
    officer: 'कल्याण अधिकारी',
    name: 'प्रदर्शित नाम (वैकल्पिक, पहचान नहीं)',
    email: 'ईमेल',
    password: 'पासवर्ड',
    continue: 'आगे बढ़ें',
    note: 'JWT सत्र इसी डिवाइस पर। अतिथि अब भी सर्वर पर शून्य पंक्ति लिखता है।',
    officerHint: 'CSC और अधिकारी भूमिका सर्वर पर सौंपी जाती है। नए खाते CITIZEN हैं।',
    missingCredentials: 'साइन इन के लिए ईमेल और पासवर्ड चाहिए। अतिथि को दोनों की आवश्यकता नहीं।',
    failed: 'साइन इन नहीं हो सका। ईमेल और पासवर्ड जाँचें, या पहले रजिस्टर करें।',
    forget: 'यह खाता मिटाएँ',
    forgetHint: 'साइन-इन Right to Forget: DELETE /api/v1/auth/account। अतिथि की सर्वर पंक्ति नहीं।',
    forgetBusy: 'मिटा रहे हैं…',
    consent: 'सहमति वाली प्रोफ़ाइल सर्वर पर रखें (आयु, आय, ज़िला — आधार अंक कभी नहीं)।',
    consentGuest: 'अतिथि सर्वर प्रोफ़ाइल नहीं रख सकता। पहले साइन इन करें, फिर यह DPDP टॉगल इस्तेमाल करें।',
    consentOn: 'सर्वर संग्रह चालू',
    consentOff: 'सर्वर संग्रह बंद',
    consentBusy: 'सहमति सहेज रहे हैं…',
  },
  pwa: {
    install: 'ऐप स्थापित करें',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन इंजन सक्रिय',
    worker: 'सर्विस वर्कर',
  },
};

export const HOME_COPY: Record<Locale, HomeCopy> = { en, hi };
