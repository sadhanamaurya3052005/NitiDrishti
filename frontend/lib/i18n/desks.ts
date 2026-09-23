import type { Locale } from '@/lib/config';

export interface DeskCopy {
  opportunities: { eyebrow: string; title: string; lede: string; empty: string; kinds: readonly { id: 'scholarship' | 'job' | 'internship'; title: string; body: string }[] };
  eligibility: { eyebrow: string; title: string; lede: string; profile: string; engineDown: string };
  whatif: { eyebrow: string; title: string; lede: string; pick: string; current: string; unlock: string; none: string };
  compare: { eyebrow: string; title: string; lede: string; left: string; right: string };
  alerts: { eyebrow: string; title: string; lede: string; empty: string };
  assistantPage: { eyebrow: string; title: string; lede: string; open: string };
  csc: {
    consent: string;
    next: string;
    back: string;
    steps: readonly { title: string; body: string }[];
    api: { title: string; guest: string; dossiers: string; alerts: string; empty: string };
  };
  nyay: {
    drop: string;
    pending: string;
    old: string;
    neu: string;
    hint: string;
    asOf: string;
    asOfCurrent: string;
    effective: string;
    gazette: string;
    pick: string;
    ocr: {
      title: string;
      lede: string;
      guest: string;
      forbidden: string;
      drop: string;
      busy: string;
      failed: string;
      confidence: string;
      unavailable: string;
      empty: string;
      notStored: string;
    };
  };
  welfare: { eyebrow: string; title: string; stages: readonly string[]; review: WelfareReviewCopy; pipeline: WelfarePipelineCopy; admin: WelfareAdminCopy; disaster: DisasterCopy };
  analytics: { eyebrow: string; title: string; map: string };
  login: { registerHint: string; loginHint: string };
  catalogCache: CatalogCacheCopy;
}

export interface WelfarePipelineCopy {
  title: string;
  lede: string;
  empty: string;
  deadLetter: string;
  deadEmpty: string;
  rerun: string;
  signIn: string;
  forbidden: string;
  busy: string;
  batch: string;
  notLive: string;
  bronze: string;
  silver: string;
  gold: string;
  principle: string;
  noAirflow: string;
}

export interface DisasterCopy {
  title: string;
  lede: string;
  off: string;
  empty: string;
  geometry: string;
  notLive: string;
  focus: string;
  focused: string;
  signIn: string;
  forbidden: string;
  failed: string;
  busy: string;
}

export interface CatalogCacheCopy {
  title: string;
  lede: string;
  unsupported: string;
  off: string;
  ready: string;
  snapshot: string;
  none: string;
  eligibility: string;
  optOut: string;
  optIn: string;
}

export interface WelfareAdminCopy {
  title: string;
  lede: string;
  notSelf: string;
  signIn: string;
  forbidden: string;
  empty: string;
  lookup: string;
  find: string;
  save: string;
  saved: string;
  failed: string;
  busy: string;
  flags: string;
  envOnly: string;
  audit: string;
  auditEmpty: string;
  active: string;
  inactive: string;
  activate: string;
  deactivate: string;
}

export interface WelfareReviewCopy {
  title: string;
  lede: string;
  empty: string;
  signIn: string;
  forbidden: string;
  approve: string;
  reject: string;
  busy: string;
  queued: string;
  reasons: {
    thin_summary: string;
    no_rules: string;
    income_cap_conflict: string;
    needs_review: string;
  };
}

const en: DeskCopy = {
  opportunities: {
    eyebrow: 'Opportunities',
    title: 'Scholarships, jobs and internships',
    lede: 'Rows come from official ingestion only. Until a source connector publishes records, this desk stays empty — no invented listings.',
    empty: 'No data from official sources yet. Check back after the next refresh.',
    kinds: [
      { id: 'scholarship', title: 'Scholarships', body: 'NSP, UGC and state education assistance once the scholarship connector verifies a gazette.' },
      { id: 'job', title: 'Government jobs', body: 'Official recruitment notifications. Application windows come from the source document, not a job board scrape.' },
      { id: 'internship', title: 'Internships & training', body: 'AICTE / ministry internship circulars after official ingest.' },
    ],
  },
  eligibility: {
    eyebrow: 'AST engine',
    title: 'Deterministic eligibility',
    lede: 'A boolean evaluator — AND / OR, ≥, ≤, IN — prints pass, fail or unknown. A language model does not vote. This is an assessment on declared facts, not a department sanction.',
    profile: 'Declared profile (device-local, zero server rows in guest mode)',
    engineDown:
      'Eligibility engine unreachable. Pass/fail is not printed from this browser — reconnect and try again.',
  },
  whatif: {
    eyebrow: 'Sensitivity',
    title: 'What-If sensitivity',
    lede: 'When a rule fails, the engine computes the shortest realistic change. There is no dead-end “Not eligible” card.',
    pick: 'Scheme',
    current: 'Current AST print',
    unlock: 'Counterfactual unlock path',
    none: 'Every evaluated rule already passes, or the fail has no numeric unlock (for example an age ceiling).',
  },
  compare: {
    eyebrow: 'Comparison',
    title: 'Scheme comparison',
    lede: 'Two official records, rule by rule. Cross-stacking (non-conflicting bundle) lands with the Welfare Maximizer — this desk only diffs criteria.',
    left: 'Scheme A',
    right: 'Scheme B',
  },
  alerts: {
    eyebrow: 'Alerts',
    title: 'Alerts & deadlines',
    lede: 'Signed-in accounts can scan published schemes for matches. Matching runs when you ask, or after a scheduled catalog refresh. Nothing is invented here.',
    empty: 'No alert rows yet. Sign in to scan published schemes, or check back after the next refresh.',
  },
  assistantPage: {
    eyebrow: 'Assistant',
    title: 'NitiDrishti Assistant',
    lede: 'Searches official ingested text. Does not decide eligibility. Every reply must carry a source. Uncited generation is refused.',
    open: 'Open NitiDrishti Assistant',
  },
  csc: {
    consent: 'Citizen consented to assisted onboarding. Guest records stay on this device. A signed-in submit writes an application row without name or ID digits.',
    next: 'Next',
    back: 'Back',
    steps: [
      { title: 'Citizen profile', body: 'Age, income, category — large kiosk controls. Guest mode writes zero server rows.' },
      { title: 'Find opportunity', body: 'Official scheme catalog. Search runs against published PostgreSQL rows.' },
      { title: 'Check eligibility', body: 'Same AST print as the citizen desk, on declared facts. No timing claim.' },
      { title: 'Documents', body: 'Readiness checklist. Missing proofs are flagged before the tehsil, not after.' },
      { title: 'Action Dossier', body: 'Monochrome print queue. Gazette hash and helpline print when the dossier worker is live.' },
    ],
    api: {
      title: 'Server dossiers and alerts',
      guest: 'Sign in to read dossiers and alerts from the API. Guest mode writes zero server rows; the kiosk queue stays in IndexedDB.',
      dossiers: 'Dossiers',
      alerts: 'Alerts',
      empty: 'No server rows yet for this account.',
    },
  },
  nyay: {
    drop: 'Drop an official gazette PDF. Text PDFs use the ingest connector. Scanned pages use local Tesseract when the officer OCR preview or FEATURE_AI_EXTRACTION is on. Identity files are not uploaded.',
    pending: 'No clause graph yet. Low-confidence extractions will require human review before they become rules.',
    old: 'Previous version',
    neu: 'Current version',
    hint: 'Old vs new deltas appear after two versions of the same instrument are ingested.',
    asOf: 'As on',
    asOfCurrent: 'current gazette',
    effective: 'Effective',
    gazette: 'Gazette',
    pick: 'Instrument',
    ocr: {
      title: 'Gazette OCR preview',
      lede: 'Local Tesseract + confidence. The file is not stored. A language model does not vote eligibility.',
      guest: 'Sign in as an officer to OCR a scanned gazette. Guests upload nothing.',
      forbidden: 'OCR preview is for welfare / analyst / admin roles.',
      drop: 'Drop a scanned PDF or image — preview only',
      busy: 'Reading pages…',
      failed: 'OCR preview failed.',
      confidence: 'Confidence',
      unavailable: 'Tesseract is not installed on this machine — fail-closed.',
      empty: 'No text returned.',
      notStored: 'persisted: false · digits longer than 7 are scrubbed',
    },
  },
  welfare: {
    eyebrow: 'Welfare desk',
    title: 'Application survival funnel',
    stages: ['Discovered', 'Submitted', 'Tehsil Verified', 'Sanctioned', 'DBT Disbursed'],
    review: {
      title: 'Human review gate',
      lede: 'Low-confidence ingest stays here until an assigned officer publishes. These rows are not on the public catalog.',
      empty: 'No schemes waiting for review.',
      signIn: 'Sign in with an assigned officer, analyst, or admin account. A guest preview cannot publish.',
      forbidden: 'This account cannot publish catalog rows.',
      approve: 'Publish',
      reject: 'Archive',
      busy: 'Saving…',
      queued: 'waiting',
      reasons: {
        thin_summary: 'Summary is too thin to treat as gazette text',
        no_rules: 'No AST rules extracted yet',
        income_cap_conflict: 'Multiple income caps on one version',
        needs_review: 'Flagged needs_review at ingest',
      },
    },
    pipeline: {
      title: 'Official source pipeline',
      lede: 'Scheduled batch refresh of gazette URLs. This is not a live government feed. robots.txt fail-closed.',
      empty: 'No source rows yet. Status appears after the next official crawl.',
      deadLetter: 'Dead-letter',
      deadEmpty: 'No failed ingestion runs.',
      rerun: 'Re-run',
      signIn: 'Sign in as officer to inspect failed runs and re-run a source.',
      forbidden: 'This account cannot re-run sources.',
      busy: 'Running…',
      batch: 'Batch refresh',
      notLive: 'not a live feed',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      principle: 'AI extracts → evidence verifies → versioning preserves → AST decides. A language model never votes.',
      noAirflow: 'APScheduler batch — Airflow is not in this repo.',
    },
    admin: {
      title: 'Operator directory',
      lede: 'Assign CSC / officer / admin roles here. Self-registration stays CITIZEN. Feature flags are environment values — this strip does not toggle them. JWT desks update after the person signs in again. Profile fields are not shown.',
      notSelf: 'not self-serve',
      signIn: 'Sign in with an assigned ADMIN account. Guests and officers cannot change roles.',
      forbidden: 'This account cannot assign roles.',
      empty: 'No matching accounts. Lookup uses the exact email you registered.',
      lookup: 'Exact email to find',
      find: 'Find',
      save: 'Save roles',
      saved: 'Roles written. The person must sign in again for desk switches.',
      failed: 'Admin request failed.',
      busy: 'Saving…',
      flags: 'Flags',
      envOnly: 'from environment, not writable here',
      audit: 'Role-change audit',
      auditEmpty: 'No role_change rows yet.',
      active: 'active',
      inactive: 'inactive',
      activate: 'Activate',
      deactivate: 'Deactivate',
    },
    disaster: {
      title: 'Disaster catalog DSS',
      lede: 'Published disaster-sector schemes from the official catalog. Not an NDMA live feed. District names are a bundled LGD/TopoJSON join — not PostGIS, not tehsil flood %.',
      off: 'FEATURE_DISASTER_MODULE is off. No flood or beneficiary counts are invented.',
      empty: 'No published disaster-sector schemes in the catalog.',
      geometry: 'bundled TopoJSON name-join · PostGIS off',
      notLive: 'not NDMA live',
      focus: 'Focus bundled district',
      focused: 'Catalog focus',
      signIn: 'Sign in as officer, analyst, or admin to record a catalog focus. Guests only read published rows.',
      forbidden: 'This account cannot write a disaster focus.',
      failed: 'Disaster DSS request failed.',
      busy: 'Loading…',
    },
  },
  analytics: {
    eyebrow: 'District analytics',
    title: 'District catalog share',
    map: 'Heatmaps join bundled TopoJSON districts by name. Colour is catalog share versus the fullest state — not tehsil beneficiary %. Dummy pins are not used. PostGIS does not serve this map.',
  },
  login: {
    registerHint: 'Register creates a CITIZEN account with JWT. Guest stays on this device only — zero server rows.',
    loginHint: 'Sign in with email, or continue as guest. CSC and officer roles are assigned, not self-served.',
  },
  catalogCache: {
    title: 'Catalog snapshot',
    lede: 'This device can keep the last successful published-scheme fetch for offline reading. It is not a full offline app — ingest, eligibility votes, and identity stay off this cache.',
    unsupported: 'This browser has no service worker. Catalog cache is fail-closed.',
    off: 'Offline catalog cache is off. The service worker stays unregistered.',
    ready: 'Service worker registered — catalog cache only.',
    snapshot: 'Snapshot from last successful fetch',
    none: 'No catalog snapshot on this device yet. Open schemes while online once.',
    eligibility: 'Eligibility still needs the API when you are online. A language model never votes.',
    optOut: 'Stop caching catalog',
    optIn: 'Allow catalog cache',
  },
};

const hi: DeskCopy = {
  opportunities: {
    eyebrow: 'अवसर',
    title: 'छात्रवृत्ति, नौकरियाँ और इंटर्नशिप',
    lede: 'ये पंक्तियाँ केवल आधिकारिक ingestion से आती हैं। कनेक्टर प्रकाशित करने तक यह डेस्क खाली रहती है — कोई काल्पनिक लिस्टिंग नहीं।',
    empty: 'आधिकारिक स्रोतों से अभी कोई डेटा नहीं। अगले रिफ़्रेश के बाद फिर देखें।',
    kinds: [
      { id: 'scholarship', title: 'छात्रवृत्ति', body: 'NSP, UGC और राज्य सहायता — जब छात्रवृत्ति कनेक्टर राजपत्र सत्यापित करे।' },
      { id: 'job', title: 'सरकारी नौकरियाँ', body: 'आधिकारिक भर्ती अधिसूचनाएँ। आवेदन खिड़की स्रोत दस्तावेज़ से आती है।' },
      { id: 'internship', title: 'इंटर्नशिप एवं प्रशिक्षण', body: 'AICTE / मंत्रालय परिपत्र, आधिकारिक ingest के बाद।' },
    ],
  },
  eligibility: {
    eyebrow: 'AST इंजन',
    title: 'नियतात्मक पात्रता',
    lede: 'बूलियन मूल्यांकक — AND / OR, ≥, ≤, IN — पास, फेल या अज्ञात छापता है। भाषा मॉडल वोट नहीं डालता। यह घोषित तथ्यों पर मूल्यांकन है, विभाग की स्वीकृति नहीं।',
    profile: 'घोषित प्रोफ़ाइल (डिवाइस पर, अतिथि मोड में सर्वर पंक्ति शून्य)',
    engineDown:
      'पात्रता इंजन उपलब्ध नहीं। पास/फेल इस ब्राउज़र से नहीं छापा जाएगा — फिर जुड़कर कोशिश करें।',
  },
  whatif: {
    eyebrow: 'संवेदनशीलता',
    title: 'What-If संवेदनशीलता',
    lede: 'नियम फेल हो तो इंजन सबसे छोटी वास्तविक तब्दीली निकालता है। “पात्र नहीं” पर प्रक्रिया खत्म नहीं होती।',
    pick: 'योजना',
    current: 'वर्तमान AST प्रिंट',
    unlock: 'काउंटरफैक्चुअल अनलॉक पथ',
    none: 'मूल्यांकित नियम पास हैं, या फेल का संख्यात्मक अनलॉक नहीं (जैसे आयु की ऊपरी सीमा)।',
  },
  compare: {
    eyebrow: 'तुलना',
    title: 'योजना तुलना',
    lede: 'दो आधिकारिक रिकॉर्ड, नियम-दर-नियम। क्रॉस-स्टैकिंग Welfare Maximizer के साथ आएगी।',
    left: 'योजना A',
    right: 'योजना B',
  },
  alerts: {
    eyebrow: 'अलर्ट',
    title: 'अलर्ट एवं समय-सीमा',
    lede: 'साइन-इन खाते प्रकाशित योजनाओं की जाँच कर सकते हैं। मिलान आपके अनुरोध पर, या निर्धारित कैटलॉग रिफ़्रेश के बाद चलता है। यहाँ कुछ गढ़ा नहीं गया।',
    empty: 'अभी कोई अलर्ट पंक्ति नहीं। साइन इन करके प्रकाशित योजनाएँ जाँचें, या अगले रिफ़्रेश के बाद फिर देखें।',
  },
  assistantPage: {
    eyebrow: 'सहायक',
    title: 'नीति दृष्टि सहायक',
    lede: 'आधिकारिक संग्रहित पाठ खोजता है। पात्रता तय नहीं करता। हर उत्तर में स्रोत होना चाहिए।',
    open: 'नीति दृष्टि सहायक खोलें',
  },
  csc: {
    consent: 'नागरिक ने सहायता-युक्त ऑनबोर्डिंग की सहमति दी। अतिथि रिकॉर्ड इसी डिवाइस पर रहते हैं। साइन-इन आवेदन पंक्ति नाम/पहचान अंक के बिना लिखती है।',
    next: 'आगे',
    back: 'पीछे',
    steps: [
      { title: 'नागरिक प्रोफ़ाइल', body: 'आयु, आय, श्रेणी — बड़े कियोस्क नियंत्रण। अतिथि मोड सर्वर पर शून्य पंक्ति।' },
      { title: 'अवसर खोज', body: 'आधिकारिक योजना कैटलॉग। खोज प्रकाशित PostgreSQL पंक्तियों पर चलती है।' },
      { title: 'पात्रता जाँच', body: 'नागरिक डेस्क जैसा AST प्रिंट, घोषित तथ्यों पर। समय का दावा नहीं।' },
      { title: 'दस्तावेज़', body: 'तैयारी सूची। कमी तहसील से पहले दिखती है, बाद में नहीं।' },
      { title: 'एक्शन डोज़ियर', body: 'मोनोक्रोम प्रिंट कतार। राजपत्र हैश डोज़ियर वर्कर के साथ छपेगा।' },
    ],
    api: {
      title: 'सर्वर डोज़ियर और अलर्ट',
      guest: 'API से डोज़ियर और अलर्ट पढ़ने के लिए साइन इन करें। अतिथि मोड सर्वर पर शून्य पंक्ति लिखता है; कियोस्क कतार IndexedDB में रहती है।',
      dossiers: 'डोज़ियर',
      alerts: 'अलर्ट',
      empty: 'इस खाते पर अभी कोई सर्वर पंक्ति नहीं।',
    },
  },
  nyay: {
    drop: 'आधिकारिक राजपत्र PDF छोड़ें। पाठ PDF ingest कनेक्टर से। स्कैन पृष्ठ अधिकारी OCR पूर्वावलोकन या FEATURE_AI_EXTRACTION पर स्थानीय Tesseract से। पहचान फ़ाइलें अपलोड नहीं।',
    pending: 'अभी कोई क्लॉज़ ग्राफ नहीं। कम भरोसे वाले निष्कर्ष मानव समीक्षा के बिना नियम नहीं बनेंगे।',
    old: 'पिछला संस्करण',
    neu: 'वर्तमान संस्करण',
    hint: 'संख्यात्मक अंतर तब दिखेगा जब उसी दस्तावेज़ के दो संस्करण ingest हो चुके होंगे।',
    asOf: 'तिथि',
    asOfCurrent: 'वर्तमान राजपत्र',
    effective: 'प्रभावी',
    gazette: 'राजपत्र',
    pick: 'दस्तावेज़',
    ocr: {
      title: 'राजपत्र OCR पूर्वावलोकन',
      lede: 'स्थानीय Tesseract + विश्वास अंक। फ़ाइल संग्रहीत नहीं। भाषा मॉडल पात्रता पर वोट नहीं करता।',
      guest: 'स्कैन राजपत्र OCR के लिए अधिकारी के रूप में साइन इन करें। अतिथि कुछ अपलोड नहीं करता।',
      forbidden: 'OCR पूर्वावलोकन कल्याण / विश्लेषक / एडमिन भूमिकाओं के लिए है।',
      drop: 'स्कैन PDF या छवि छोड़ें — केवल पूर्वावलोकन',
      busy: 'पृष्ठ पढ़ रहे हैं…',
      failed: 'OCR पूर्वावलोकन असफल।',
      confidence: 'विश्वास',
      unavailable: 'इस मशीन पर Tesseract नहीं — fail-closed.',
      empty: 'कोई पाठ नहीं मिला।',
      notStored: 'persisted: false · 7 से लंबे अंक मिटाए जाते हैं',
    },
  },
  welfare: {
    eyebrow: 'कल्याण डेस्क',
    title: 'आवेदन सर्वाइवल फ़नल',
    stages: ['खोजे गए', 'आवेदन जमा', 'तहसील सत्यापित', 'स्वीकृत', 'डीबीटी वितरण'],
    review: {
      title: 'मानव समीक्षा द्वार',
      lede: 'कम भरोसे वाला ingest यहीं रहता है जब तक सौंपा अधिकारी प्रकाशित न करे। ये पंक्तियाँ सार्वजनिक कैटलॉग पर नहीं हैं।',
      empty: 'समीक्षा की प्रतीक्षा में कोई योजना नहीं।',
      signIn: 'सौंपे हुए अधिकारी, विश्लेषक या एडमिन खाते से साइन इन करें। अतिथि पूर्वावलोकन प्रकाशित नहीं कर सकता।',
      forbidden: 'यह खाता कैटलॉग पंक्तियाँ प्रकाशित नहीं कर सकता।',
      approve: 'प्रकाशित करें',
      reject: 'संग्रहित करें',
      busy: 'सहेज रहा है…',
      queued: 'प्रतीक्षा',
      reasons: {
        thin_summary: 'सारांश राजपत्र जैसा मानने के लिए बहुत पतला है',
        no_rules: 'अभी कोई AST नियम नहीं निकला',
        income_cap_conflict: 'एक संस्करण पर एक से अधिक आय सीमाएँ',
        needs_review: 'ingest पर needs_review चिह्नित',
      },
    },
    pipeline: {
      title: 'आधिकारिक स्रोत पाइपलाइन',
      lede: 'राजपत्र URL का निर्धारित बैच रिफ़्रेश। यह लाइव सरकारी फ़ीड नहीं है। robots.txt बंद रहता है।',
      empty: 'अभी कोई स्रोत पंक्ति नहीं। अगले आधिकारिक क्रॉल के बाद स्थिति दिखेगी।',
      deadLetter: 'डेड-लेटर',
      deadEmpty: 'कोई असफल ingestion रन नहीं।',
      rerun: 'फिर चलाएँ',
      signIn: 'असफल रन देखने और स्रोत फिर चलाने के लिए अधिकारी के रूप में साइन इन करें।',
      forbidden: 'यह खाता स्रोत फिर नहीं चला सकता।',
      busy: 'चल रहा है…',
      batch: 'बैच रिफ़्रेश',
      notLive: 'लाइव फ़ीड नहीं',
      bronze: 'ब्रॉन्ज़',
      silver: 'सिल्वर',
      gold: 'गोल्ड',
      principle: 'AI निकालता है → साक्ष्य सत्यापित करता है → संस्करण सुरक्षित रहते हैं → AST तय करता है। भाषा मॉडल वोट नहीं करता।',
      noAirflow: 'APScheduler बैच — इस रेपो में Airflow नहीं है।',
    },
    admin: {
      title: 'संचालक निर्देशिका',
      lede: 'CSC / अधिकारी / एडमिन भूमिकाएँ यहाँ सौंपी जाती हैं। स्वयं-रजिस्टर CITIZEN रहता है। फ़ीचर फ़्लैग पर्यावरण से आते हैं — यह पट्टी उन्हें चालू/बंद नहीं करती। डेस्क JWT अगले साइन-इन पर बदलते हैं। प्रोफ़ाइल फ़ील्ड नहीं दिखते।',
      notSelf: 'स्वयं नहीं',
      signIn: 'सौंपे ADMIN खाते से साइन इन करें। अतिथि और अधिकारी भूमिका नहीं बदल सकते।',
      forbidden: 'यह खाता भूमिकाएँ नहीं सौंप सकता।',
      empty: 'कोई खाता नहीं मिला। खोज उस ईमेल से करें जो रजिस्टर किया गया।',
      lookup: 'सटीक ईमेल',
      find: 'खोजें',
      save: 'भूमिकाएँ सहेजें',
      saved: 'भूमिका लिखी गई। डेस्क बदलने के लिए व्यक्ति को फिर साइन इन करना होगा।',
      failed: 'एडमिन अनुरोध असफल।',
      busy: 'सहेज रहा है…',
      flags: 'फ़्लैग',
      envOnly: 'पर्यावरण से, यहाँ नहीं बदलते',
      audit: 'भूमिका-परिवर्तन ऑडिट',
      auditEmpty: 'अभी कोई role_change पंक्ति नहीं।',
      active: 'सक्रिय',
      inactive: 'निष्क्रिय',
      activate: 'सक्रिय करें',
      deactivate: 'निष्क्रिय करें',
    },
    disaster: {
      title: 'आपदा कैटलॉग DSS',
      lede: 'आधिकारिक कैटलॉग की प्रकाशित आपदा-क्षेत्र योजनाएँ। NDMA लाइव फ़ीड नहीं। ज़िला नाम बंडल LGD/TopoJSON जोड़ हैं — PostGIS नहीं, तहसील बाढ़ % नहीं।',
      off: 'FEATURE_DISASTER_MODULE बंद है। बाढ़ या लाभार्थी संख्याएँ गढ़ी नहीं जातीं।',
      empty: 'कैटलॉग में कोई प्रकाशित आपदा-क्षेत्र योजना नहीं।',
      geometry: 'बंडल TopoJSON नाम-जोड़ · PostGIS बंद',
      notLive: 'NDMA लाइव नहीं',
      focus: 'बंडल ज़िला फ़ोकस',
      focused: 'कैटलॉग फ़ोकस',
      signIn: 'कैटलॉग फ़ोकस लिखने के लिए अधिकारी, विश्लेषक या एडमिन से साइन इन करें। अतिथि केवल प्रकाशित पंक्तियाँ पढ़ता है।',
      forbidden: 'यह खाता आपदा फ़ोकस नहीं लिख सकता।',
      failed: 'आपदा DSS अनुरोध असफल।',
      busy: 'लोड हो रहा है…',
    },
  },
  analytics: {
    eyebrow: 'ज़िला एनालिटिक्स',
    title: 'ज़िला कैटलॉग हिस्सा',
    map: 'हीटमैप बंडल TopoJSON ज़िलों को नाम से जोड़ते हैं। रंग सबसे भरे राज्य के सापेक्ष कैटलॉग हिस्सा है — तहसील लाभार्थी % नहीं। डमी पिन नहीं। यह नक्शा PostGIS से नहीं आता।',
  },
  login: {
    registerHint: 'रजिस्टर JWT के साथ CITIZEN खाता बनाता है। अतिथि केवल इस डिवाइस पर रहता है — सर्वर पर शून्य पंक्ति।',
    loginHint: 'ईमेल से साइन इन करें, या अतिथि रहें। CSC और अधिकारी भूमिकाएँ सौंपी जाती हैं, स्वयं नहीं ली जातीं।',
  },
  catalogCache: {
    title: 'कैटलॉग स्नैपशॉट',
    lede: 'यह डिवाइस पिछली सफल प्रकाशित-योजना प्राप्ति को ऑफ़लाइन पढ़ने के लिए रख सकता है। यह पूरा ऑफ़लाइन ऐप नहीं — ingest, पात्रता वोट और पहचान इस कैश में नहीं।',
    unsupported: 'इस ब्राउज़र में सर्विस वर्कर नहीं। कैटलॉग कैश fail-closed है।',
    off: 'ऑफ़लाइन कैटलॉग कैश बंद है। सर्विस वर्कर अनरजिस्टर रहता है।',
    ready: 'सर्विस वर्कर पंजीकृत — केवल कैटलॉग कैश।',
    snapshot: 'पिछली सफल प्राप्ति का स्नैपशॉट',
    none: 'इस डिवाइस पर अभी कैटलॉग स्नैपशॉट नहीं। ऑनलाइन रहकर योजनाएँ एक बार खोलें।',
    eligibility: 'पात्रता के लिए ऑनलाइन होने पर API चाहिए। भाषा मॉडल वोट नहीं करता।',
    optOut: 'कैटलॉग कैश बंद करें',
    optIn: 'कैटलॉग कैश अनुमति दें',
  },
};

export const DESK_COPY: Record<Locale, DeskCopy> = { en, hi };
