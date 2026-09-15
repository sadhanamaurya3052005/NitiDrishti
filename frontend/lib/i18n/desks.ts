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
    lede: 'A boolean evaluator — AND / OR, ≥, ≤, IN — prints pass, fail or unknown. A language model does not vote.',
    profile: 'Declared profile (device-local, zero server rows in guest mode)',
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
    consent: 'Citizen consented to assisted onboarding on this desk (recorded on this device until a consented profile is saved).',
    next: 'Next',
    back: 'Back',
    steps: [
      { title: 'Citizen profile', body: 'Age, income, category — large kiosk controls. Guest mode writes zero server rows.' },
      { title: 'Find opportunity', body: 'Official scheme catalog. Search runs against published PostgreSQL rows.' },
      { title: 'Check eligibility', body: 'Local AST in under 2 ms. Same engine as the citizen desk.' },
      { title: 'Documents', body: 'Readiness checklist. Missing proofs are flagged before the tehsil, not after.' },
      { title: 'Action Dossier', body: 'Monochrome print queue. Gazette hash and helpline print when the dossier worker is live.' },
    ],
  },
  nyay: {
    drop: 'Drop an official gazette PDF. Text extraction uses the ingestion PDF connector; scanned OCR is a later pipeline. The file stays in browser memory.',
    pending: 'No clause graph yet. Low-confidence extractions will require human review before they become rules.',
    old: 'Previous version',
    neu: 'Current version',
    hint: 'Old vs new deltas appear after two versions of the same instrument are ingested.',
  },
  welfare: {
    eyebrow: 'Welfare desk',
    title: 'Application survival funnel',
    stages: ['Discovered', 'Submitted', 'Tehsil Verified', 'Sanctioned', 'DBT Disbursed'],
  },
  analytics: {
    eyebrow: 'District analytics',
    title: 'District saturation',
    map: 'Heatmaps sit on official district polygons. No dummy pins. Geometry loads when PostGIS is installed.',
  },
  login: {
    registerHint: 'Register creates a CITIZEN account with JWT. Guest stays on this device only — zero server rows.',
    loginHint: 'Sign in with email, or continue as guest. CSC and officer roles are assigned, not self-served.',
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
    lede: 'बूलियन मूल्यांकक — AND / OR, ≥, ≤, IN — पास, फेल या अज्ञात छापता है। भाषा मॉडल वोट नहीं डालता।',
    profile: 'घोषित प्रोफ़ाइल (डिवाइस पर, अतिथि मोड में सर्वर पंक्ति शून्य)',
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
    consent: 'नागरिक ने इस डेस्क पर सहायता-युक्त ऑनबोर्डिंग की सहमति दी (सहमति-युक्त प्रोफ़ाइल सहेजने तक केवल इस डिवाइस पर)।',
    next: 'आगे',
    back: 'पीछे',
    steps: [
      { title: 'नागरिक प्रोफ़ाइल', body: 'आयु, आय, श्रेणी — बड़े कियोस्क नियंत्रण। अतिथि मोड सर्वर पर शून्य पंक्ति।' },
      { title: 'अवसर खोज', body: 'आधिकारिक योजना कैटलॉग। खोज प्रकाशित PostgreSQL पंक्तियों पर चलती है।' },
      { title: 'पात्रता जाँच', body: 'लोकल AST 2 ms से कम। वही इंजन जो नागरिक डेस्क पर है।' },
      { title: 'दस्तावेज़', body: 'तैयारी सूची। कमी तहसील से पहले दिखती है, बाद में नहीं।' },
      { title: 'एक्शन डोज़ियर', body: 'मोनोक्रोम प्रिंट कतार। राजपत्र हैश डोज़ियर वर्कर के साथ छपेगा।' },
    ],
  },
  nyay: {
    drop: 'आधिकारिक राजपत्र PDF छोड़ें। पाठ निष्कर्षण ingestion PDF कनेक्टर से होता है। फ़ाइल ब्राउज़र मेमोरी में रहती है।',
    pending: 'अभी कोई क्लॉज़ ग्राफ नहीं। कम भरोसे वाले निष्कर्ष मानव समीक्षा के बिना नियम नहीं बनेंगे।',
    old: 'पिछला संस्करण',
    neu: 'वर्तमान संस्करण',
    hint: 'संख्यात्मक अंतर तब दिखेगा जब उसी दस्तावेज़ के दो संस्करण ingest हो चुके होंगे।',
  },
  welfare: {
    eyebrow: 'कल्याण डेस्क',
    title: 'आवेदन सर्वाइवल फ़नल',
    stages: ['खोजे गए', 'आवेदन जमा', 'तहसील सत्यापित', 'स्वीकृत', 'डीबीटी वितरण'],
  },
  analytics: {
    eyebrow: 'ज़िला एनालिटिक्स',
    title: 'ज़िला संतृप्ति',
    map: 'हीटमैप आधिकारिक ज़िला पॉलीगॉन पर बैठते हैं। डमी पिन नहीं। ज्यामिति PostGIS चालू होने पर आएगी।',
  },
  login: {
    registerHint: 'रजिस्टर JWT के साथ CITIZEN खाता बनाता है। अतिथि केवल इस डिवाइस पर रहता है — सर्वर पर शून्य पंक्ति।',
    loginHint: 'ईमेल से साइन इन करें, या अतिथि रहें। CSC और अधिकारी भूमिकाएँ सौंपी जाती हैं, स्वयं नहीं ली जातीं।',
  },
};

export const DESK_COPY: Record<Locale, DeskCopy> = { en, hi };
