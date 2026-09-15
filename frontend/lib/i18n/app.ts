import type { Locale } from '@/lib/config';
import type { WorkspaceId } from '@/lib/i18n/landing';

/** Copy for the authenticated application shell. */

export type ToolId = 'explore' | 'eligibility' | 'whatif' | 'compare' | 'alerts' | 'assistant';

export interface WorkspaceShellCopy {
  name: string;
  short: string;
  purpose: string;
  modules: readonly string[];
}

export interface AppCopy {
  nav: {
    workspaces: string;
    tools: string;
    collapse: string;
    expand: string;
    backToSite: string;
  };
  topbar: {
    search: string;
    searchHint: string;
    listen: string;
    stop: string;
    online: string;
    offline: string;
    roleLabel: string;
    previewNote: string;
  };
  intro: {
    statusLabel: string;
    plannedTitle: string;
    dataNote: string;
    emptyTitle: string;
    emptyBody: string;
  };
  palette: {
    placeholder: string;
    workspaces: string;
    tools: string;
    empty: string;
    hint: string;
    locked: string;
  };
  workspaces: Record<WorkspaceId, WorkspaceShellCopy>;
  tools: Record<ToolId, { name: string; status: string }>;
}

const en: AppCopy = {
  nav: {
    workspaces: 'Workspaces',
    tools: 'Smart tools',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    backToSite: 'Back to overview',
  },
  topbar: {
    search: 'Search workspaces',
    searchHint: 'Ctrl K',
    listen: 'Listen to this page',
    stop: 'Stop reading',
    online: 'Online',
    offline: 'Offline — local engine',
    roleLabel: 'Viewing as',
    previewNote: 'Guest role is a preview. A signed-in session uses the server role.',
  },
  intro: {
    statusLabel: 'Desk',
    plannedTitle: 'What this workspace contains',
    dataNote:
      'Nothing here is filled with sample data. Every panel appears only once it is backed by information collected from an official source.',
    emptyTitle: 'No data from official sources yet',
    emptyBody:
      'This desk fills after the next official-source refresh. Nothing here is sample data.',
  },
  palette: {
    placeholder: 'Jump to a workspace or tool…',
    workspaces: 'Workspaces',
    tools: 'Smart tools',
    empty: 'Nothing matches that',
    hint: 'Enter to open · Esc to close',
    locked: 'Not available on this desk',
  },
  workspaces: {
    citizen: {
      name: 'Citizen & Student',
      short: 'Citizen',
      purpose:
        'One place to see which schemes, scholarships, jobs and internships apply to you, why you qualify, and what to do next.',
      modules: [
        'Personalised opportunity stream ranked by relevance and deadline',
        'Eligibility result with a pass or fail reason for every condition',
        'Document checklist with validity and expiry warnings',
        'Action Dossier: a printable page with the benefit, proof list and office details',
      ],
    },
    csc: {
      name: 'CSC / Kiosk Desk',
      short: 'CSC desk',
      purpose:
        'A counter-friendly flow for operators helping citizens who cannot use the platform themselves.',
      modules: [
        'Five-step assisted flow: profile, opportunities, eligibility, documents, dossier',
        'Large controls and high contrast for shared kiosk screens',
        'Consent record for every assisted session',
        'Ink-saving monochrome print output',
      ],
    },
    nyaymitra: {
      name: 'Nyay-Mitra',
      short: 'Nyay-Mitra',
      purpose:
        'Reads complex government documents, extracts the rules inside them, and shows exactly what changed between versions.',
      modules: [
        'Upload or ingest gazettes, circulars, notifications and scanned PDFs',
        'Clause extraction with page and section evidence',
        'Machine-readable eligibility rules with a confidence score',
        'Old versus new comparison with the exact numeric change and who it affects',
      ],
    },
    officer: {
      name: 'Welfare Officer',
      short: 'Officer',
      purpose:
        'Where applications stall, which stage loses citizens, and how long delivery actually takes.',
      modules: [
        'Coverage, verification, approval and delivery counts',
        'Drop-off funnel across the application journey',
        'Average processing time per stage',
        'Every figure traceable to the query that produced it',
      ],
    },
    analytics: {
      name: 'District Analytics',
      short: 'Analytics',
      purpose: 'Demand against coverage, district by district, on real geography.',
      modules: [
        'District table with demand index, coverage and gap percentage',
        'Map-based gap analysis using official district geometry',
        'Severity ranking to prioritise intervention',
        'Trend view as ingestion history builds up',
      ],
    },
  },
  tools: {
    explore: { name: 'Explore schemes & opportunities', status: 'Scheme search' },
    eligibility: { name: 'Eligibility checker', status: 'AST engine' },
    whatif: { name: 'What-if simulator', status: 'Sensitivity' },
    compare: { name: 'Compare schemes', status: 'Comparison' },
    alerts: { name: 'Alerts & deadlines', status: 'Alerts' },
    assistant: { name: 'Assistant with citations', status: 'Assistant' },
  },
};

const hi: AppCopy = {
  nav: {
    workspaces: 'वर्कस्पेस',
    tools: 'स्मार्ट टूल्स',
    collapse: 'साइडबार छोटा करें',
    expand: 'साइडबार बड़ा करें',
    backToSite: 'परिचय पृष्ठ पर लौटें',
  },
  topbar: {
    search: 'वर्कस्पेस खोजें',
    searchHint: 'Ctrl K',
    listen: 'यह पृष्ठ सुनिए',
    stop: 'पढ़ना रोकें',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन — स्थानीय इंजन',
    roleLabel: 'इस रूप में',
    previewNote: 'अतिथि भूमिका पूर्वावलोकन है। साइन-इन सत्र सर्वर भूमिका का उपयोग करता है।',
  },
  intro: {
    statusLabel: 'डेस्क',
    plannedTitle: 'इस वर्कस्पेस में क्या है',
    dataNote:
      'यहाँ कुछ भी नमूना डेटा से नहीं भरा गया है। हर पैनल तभी दिखेगा जब उसके पीछे किसी आधिकारिक स्रोत से एकत्र जानकारी मौजूद होगी।',
    emptyTitle: 'आधिकारिक स्रोतों से अभी कोई डेटा नहीं',
    emptyBody:
      'यह डेस्क अगले आधिकारिक स्रोत रिफ़्रेश के बाद भरेगा। यहाँ नमूना डेटा नहीं है।',
  },
  palette: {
    placeholder: 'वर्कस्पेस या टूल खोजें…',
    workspaces: 'वर्कस्पेस',
    tools: 'स्मार्ट टूल्स',
    empty: 'कुछ मेल नहीं खाया',
    hint: 'खोलने के लिए Enter · बंद करने के लिए Esc',
    locked: 'इस डेस्क पर उपलब्ध नहीं',
  },
  workspaces: {
    citizen: {
      name: 'नागरिक एवं विद्यार्थी',
      short: 'नागरिक',
      purpose:
        'एक ही जगह देखिए कि कौन सी योजनाएँ, छात्रवृत्तियाँ, नौकरियाँ और इंटर्नशिप आप पर लागू होती हैं, आप क्यों पात्र हैं, और आगे क्या करना है।',
      modules: [
        'प्रासंगिकता और समय-सीमा के अनुसार क्रमित व्यक्तिगत अवसर सूची',
        'हर शर्त के पास/फेल कारण के साथ पात्रता परिणाम',
        'वैधता और समाप्ति चेतावनी सहित दस्तावेज़ सूची',
        'एक्शन डोज़ियर: लाभ, प्रमाण सूची और कार्यालय विवरण वाला प्रिंट-योग्य पृष्ठ',
      ],
    },
    csc: {
      name: 'CSC / कियोस्क डेस्क',
      short: 'CSC डेस्क',
      purpose:
        'उन नागरिकों की सहायता के लिए काउंटर-अनुकूल प्रवाह, जो स्वयं प्लेटफ़ॉर्म का उपयोग नहीं कर सकते।',
      modules: [
        'पाँच-चरणीय सहायक प्रवाह: प्रोफ़ाइल, अवसर, पात्रता, दस्तावेज़, डोज़ियर',
        'साझा कियोस्क स्क्रीन के लिए बड़े नियंत्रण और उच्च कंट्रास्ट',
        'हर सहायक सत्र के लिए सहमति रिकॉर्ड',
        'स्याही-बचत मोनोक्रोम प्रिंट आउटपुट',
      ],
    },
    nyaymitra: {
      name: 'न्याय-मित्र',
      short: 'न्याय-मित्र',
      purpose:
        'जटिल सरकारी दस्तावेज़ पढ़ता है, उनमें छिपे नियम निकालता है, और बताता है कि दो संस्करणों के बीच ठीक क्या बदला।',
      modules: [
        'गजट, परिपत्र, अधिसूचना और स्कैन किए PDF अपलोड या ingest करें',
        'पृष्ठ और अनुभाग प्रमाण के साथ क्लॉज़ निष्कर्षण',
        'विश्वास स्कोर सहित मशीन-पठनीय पात्रता नियम',
        'पुराने बनाम नए की तुलना, सटीक संख्यात्मक बदलाव और प्रभावित वर्ग के साथ',
      ],
    },
    officer: {
      name: 'कल्याण अधिकारी',
      short: 'अधिकारी',
      purpose:
        'आवेदन कहाँ अटकते हैं, किस चरण पर नागरिक छूटते हैं, और वितरण में वास्तव में कितना समय लगता है।',
      modules: [
        'कवरेज, सत्यापन, स्वीकृति और वितरण की गिनती',
        'आवेदन यात्रा का ड्रॉप-ऑफ़ फ़नल',
        'प्रति चरण औसत प्रसंस्करण समय',
        'हर आँकड़ा उस क्वेरी से जुड़ा, जिसने उसे बनाया',
      ],
    },
    analytics: {
      name: 'ज़िला एनालिटिक्स',
      short: 'एनालिटिक्स',
      purpose: 'वास्तविक भूगोल पर, ज़िले-दर-ज़िले माँग बनाम कवरेज।',
      modules: [
        'माँग सूचकांक, कवरेज और अंतर प्रतिशत वाली ज़िला तालिका',
        'आधिकारिक ज़िला भूगोल पर नक्शा-आधारित अंतर विश्लेषण',
        'हस्तक्षेप की प्राथमिकता तय करने हेतु गंभीरता श्रेणी',
        'ingestion इतिहास बढ़ने के साथ प्रवृत्ति दृश्य',
      ],
    },
  },
  tools: {
    explore: { name: 'योजनाएँ एवं अवसर देखें', status: 'योजना खोज' },
    eligibility: { name: 'पात्रता जाँच', status: 'AST इंजन' },
    whatif: { name: 'व्हाट-इफ़ सिम्युलेटर', status: 'संवेदनशीलता' },
    compare: { name: 'योजनाओं की तुलना', status: 'तुलना' },
    alerts: { name: 'अलर्ट एवं समय-सीमा', status: 'अलर्ट' },
    assistant: { name: 'प्रमाण-सहित सहायक', status: 'सहायक' },
  },
};

export const APP_COPY: Record<Locale, AppCopy> = { en, hi };
