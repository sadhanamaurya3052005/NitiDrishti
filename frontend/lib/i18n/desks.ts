import type { Locale } from '@/lib/config';

export interface DeskCopy {
  opportunities: { eyebrow: string; title: string; lede: string; empty: string; kinds: readonly { id: 'scholarship' | 'job' | 'internship'; title: string; body: string }[] };
  eligibility: { eyebrow: string; title: string; lede: string; profile: string };
  whatif: { eyebrow: string; title: string; lede: string; pick: string; current: string; unlock: string; none: string };
  compare: { eyebrow: string; title: string; lede: string; left: string; right: string };
  alerts: { eyebrow: string; title: string; lede: string; empty: string };
  assistantPage: { eyebrow: string; title: string; lede: string; open: string };
  csc: { consent: string; next: string; back: string; steps: readonly { title: string; body: string }[] };
  nyay: { drop: string; pending: string; old: string; neu: string; hint: string };
  welfare: { eyebrow: string; title: string; stages: readonly string[] };
  analytics: { eyebrow: string; title: string; map: string };
  login: { registerHint: string; loginHint: string };
}

const en: DeskCopy = {
  opportunities: {
    eyebrow: 'Phase 12',
    title: 'Scholarships, jobs and internships',
    lede: 'Specialised ingestion pipelines write these rows. Until a source connector is live, this desk stays empty — no invented listings.',
    empty: 'No official opportunity records in PostgreSQL yet.',
    kinds: [
      { id: 'scholarship', title: 'Scholarships', body: 'NSP, UGC and state education assistance once the scholarship connector verifies a gazette.' },
      { id: 'job', title: 'Government jobs', body: 'Official recruitment notifications. Application windows come from the source document, not a job board scrape.' },
      { id: 'internship', title: 'Internships & training', body: 'AICTE / ministry internship circulars after Phase 12 ingestion.' },
    ],
  },
  eligibility: {
    eyebrow: 'Phase 10 · AST',
    title: 'Deterministic eligibility',
    lede: 'A boolean evaluator — AND / OR, ≥, ≤, IN — prints pass, fail or unknown. A language model does not vote.',
    profile: 'Declared profile (device-local, zero server rows in guest mode)',
  },
  whatif: {
    eyebrow: 'Phase 11',
    title: 'What-If sensitivity',
    lede: 'When a rule fails, the engine computes the shortest realistic change. There is no dead-end “Not eligible” card.',
    pick: 'Scheme',
    current: 'Current AST print',
    unlock: 'Counterfactual unlock path',
    none: 'Every evaluated rule already passes, or the fail has no numeric unlock (for example an age ceiling).',
  },
  compare: {
    eyebrow: 'Phase 11',
    title: 'Scheme comparison',
    lede: 'Two official records, rule by rule. Cross-stacking (non-conflicting bundle) lands with the Welfare Maximizer — this desk only diffs criteria.',
    left: 'Scheme A',
    right: 'Scheme B',
  },
  alerts: {
    eyebrow: 'Phase 15',
    title: 'Alerts & deadlines',
    lede: 'Profile-to-scheme jobs emit deadline and criteria alerts after matching workers run. Nothing is invented here.',
    empty: 'No alert rows. Matching jobs are not scheduled until Phase 15.',
  },
  assistantPage: {
    eyebrow: 'Phase 17 · Grounded RAG',
    title: 'Assistant with citations',
    lede: 'Answers only from indexed official chunks. Every reply must carry page, section or clause. Uncited generation is refused.',
    open: 'Open NitiDrishti Mitra',
  },
  csc: {
    consent: 'Citizen consented to assisted onboarding on this desk (recorded only on this device until Phase 4).',
    next: 'Next',
    back: 'Back',
    steps: [
      { title: 'Citizen profile', body: 'Age, income, category — large kiosk controls. Guest mode writes zero server rows.' },
      { title: 'Find opportunity', body: 'Official scheme catalog on this device. Faceted search is Phase 9.' },
      { title: 'Check eligibility', body: 'Local AST in under 2 ms. Same engine as the citizen desk.' },
      { title: 'Documents', body: 'Readiness checklist. Missing proofs are flagged before the tehsil, not after.' },
      { title: 'Action Dossier', body: 'Monochrome print queue. Gazette hash and helpline print with the worker in Phase 11.' },
    ],
  },
  nyay: {
    drop: 'Drop an official gazette PDF. Parsing is Phase 13 (PyMuPDF → Tesseract fallback → structured JSON). The file stays in browser memory.',
    pending: 'No clause graph yet. Low-confidence extractions will require human review before they become rules.',
    old: 'Previous version',
    neu: 'Current version',
    hint: 'Old vs new numeric deltas (Phase 14) appear after two versioned hashes exist.',
  },
  welfare: {
    eyebrow: 'Phase 16',
    title: 'Application survival funnel',
    stages: ['Discovered', 'Form uploaded', 'Tehsil review', 'Sanctioned', 'Disbursed'],
  },
  analytics: {
    eyebrow: 'Phase 16 · PostGIS',
    title: 'District saturation',
    map: 'Heatmaps sit on official district polygons. No dummy pins. Geometry loads with the analytics worker.',
  },
  login: {
    registerHint: 'Register creates a device-local session. JWT + RBAC ship in Phase 4.',
    loginHint: 'Sign in as guest, citizen or CSC operator. Guest mode is empty on the server.',
  },
};

const hi: DeskCopy = {
  opportunities: {
    eyebrow: 'फेज़ 12',
    title: 'छात्रवृत्ति, नौकरियाँ और इंटर्नशिप',
    lede: 'ये पंक्तियाँ specialised ingestion से आती हैं। कनेक्टर जीवित होने तक यह डेस्क खाली रहती है — कोई काल्पनिक लिस्टिंग नहीं।',
    empty: 'PostgreSQL में अभी कोई आधिकारिक अवसर रिकॉर्ड नहीं।',
    kinds: [
      { id: 'scholarship', title: 'छात्रवृत्ति', body: 'NSP, UGC और राज्य सहायता — जब छात्रवृत्ति कनेक्टर राजपत्र सत्यापित करे।' },
      { id: 'job', title: 'सरकारी नौकरियाँ', body: 'आधिकारिक भर्ती अधिसूचनाएँ। आवेदन खिड़की स्रोत दस्तावेज़ से आती है।' },
      { id: 'internship', title: 'इंटर्नशिप एवं प्रशिक्षण', body: 'AICTE / मंत्रालय परिपत्र, फेज़ 12 ingestion के बाद।' },
    ],
  },
  eligibility: {
    eyebrow: 'फेज़ 10 · AST',
    title: 'नियतात्मक पात्रता',
    lede: 'बूलियन मूल्यांकक — AND / OR, ≥, ≤, IN — पास, फेल या अज्ञात छापता है। भाषा मॉडल वोट नहीं डालता।',
    profile: 'घोषित प्रोफ़ाइल (डिवाइस पर, अतिथि मोड में सर्वर पंक्ति शून्य)',
  },
  whatif: {
    eyebrow: 'फेज़ 11',
    title: 'What-If संवेदनशीलता',
    lede: 'नियम फेल हो तो इंजन सबसे छोटी वास्तविक तब्दीली निकालता है। “पात्र नहीं” पर प्रक्रिया खत्म नहीं होती।',
    pick: 'योजना',
    current: 'वर्तमान AST प्रिंट',
    unlock: 'काउंटरफैक्चुअल अनलॉक पथ',
    none: 'मूल्यांकित नियम पास हैं, या फेल का संख्यात्मक अनलॉक नहीं (जैसे आयु की ऊपरी सीमा)।',
  },
  compare: {
    eyebrow: 'फेज़ 11',
    title: 'योजना तुलना',
    lede: 'दो आधिकारिक रिकॉर्ड, नियम-दर-नियम। क्रॉस-स्टैकिंग Welfare Maximizer के साथ आएगी।',
    left: 'योजना A',
    right: 'योजना B',
  },
  alerts: {
    eyebrow: 'फेज़ 15',
    title: 'अलर्ट एवं समय-सीमा',
    lede: 'मिलान जॉब समय-सीमा और मापदंड अलर्ट तब भेजेंगे जब वर्कर चलेगा। यहाँ कुछ गढ़ा नहीं गया।',
    empty: 'कोई अलर्ट पंक्ति नहीं। मिलान जॉब फेज़ 15 तक निर्धारित नहीं।',
  },
  assistantPage: {
    eyebrow: 'फेज़ 17 · ग्राउंडेड RAG',
    title: 'प्रमाण-सहित सहायक',
    lede: 'उत्तर केवल अनुक्रमित आधिकारिक खंडों से। हर उत्तर में पृष्ठ, अनुभाग या खंड होना चाहिए।',
    open: 'NitiDrishti मित्र खोलें',
  },
  csc: {
    consent: 'नागरिक ने इस डेस्क पर सहायता-युक्त ऑनबोर्डिंग की सहमति दी (फेज़ 4 तक केवल इस डिवाइस पर)।',
    next: 'आगे',
    back: 'पीछे',
    steps: [
      { title: 'नागरिक प्रोफ़ाइल', body: 'आयु, आय, श्रेणी — बड़े कियोस्क नियंत्रण। अतिथि मोड सर्वर पर शून्य पंक्ति।' },
      { title: 'अवसर खोज', body: 'इसी डिवाइस पर आधिकारिक योजना कैटलॉग। फेसेटेड खोज फेज़ 9।' },
      { title: 'पात्रता जाँच', body: 'लोकल AST 2 ms से कम। वही इंजन जो नागरिक डेस्क पर है।' },
      { title: 'दस्तावेज़', body: 'तैयारी सूची। कमी तहसील से पहले दिखती है, बाद में नहीं।' },
      { title: 'एक्शन डोज़ियर', body: 'मोनोक्रोम प्रिंट कतार। राजपत्र हैश फेज़ 11 के वर्कर के साथ छपेगा।' },
    ],
  },
  nyay: {
    drop: 'आधिकारिक राजपत्र PDF छोड़ें। पार्सिंग फेज़ 13 है। फ़ाइल ब्राउज़र मेमोरी में रहती है।',
    pending: 'अभी कोई क्लॉज़ ग्राफ नहीं। कम भरोसे वाले निष्कर्ष मानव समीक्षा के बिना नियम नहीं बनेंगे।',
    old: 'पिछला संस्करण',
    neu: 'वर्तमान संस्करण',
    hint: 'संख्यात्मक अंतर तब दिखेगा जब दो वर्शन्ड हैश मौजूद होंगे (फेज़ 14)।',
  },
  welfare: {
    eyebrow: 'फेज़ 16',
    title: 'आवेदन सर्वाइवल फ़नल',
    stages: ['खोजे गए', 'फॉर्म अपलोड', 'तहसील समीक्षा', 'स्वीकृत', 'वितरित'],
  },
  analytics: {
    eyebrow: 'फेज़ 16 · PostGIS',
    title: 'ज़िला संतृप्ति',
    map: 'हीटमैप आधिकारिक ज़िला पॉलीगॉन पर बैठते हैं। डमी पिन नहीं। ज्यामिति एनालिटिक्स वर्कर के साथ आएगी।',
  },
  login: {
    registerHint: 'रजिस्टर डिवाइस-स्थानीय सत्र बनाता है। JWT और RBAC फेज़ 4 में।',
    loginHint: 'अतिथि, नागरिक या CSC संचालक के रूप में प्रवेश। अतिथि मोड सर्वर पर खाली है।',
  },
};

export const DESK_COPY: Record<Locale, DeskCopy> = { en, hi };
