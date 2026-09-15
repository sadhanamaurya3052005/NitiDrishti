import type { SchemeCategory } from '@/types';

export interface CivicSector {
  id: string;
  icon:
    | 'Tractor'
    | 'HeartHandshake'
    | 'GraduationCap'
    | 'Briefcase'
    | 'Baby'
    | 'Wrench'
    | 'Landmark'
    | 'Activity'
    | 'Home'
    | 'Trophy'
    | 'Cpu'
    | 'Truck'
    | 'MapPin'
    | 'Droplets'
    | 'Scale'
    | 'Hammer'
    | 'AlertOctagon'
    | 'Bike';
  nameEn: string;
  nameHi: string;
  /** Catalog category matching the 18 marquee ids in Postgres. */
  category: SchemeCategory;
  /** Real-world sector colour for the myScheme-style circular mark. */
  color: string;
}

/** Eighteen public G2C sectors. Names only — no invented scheme counts. */
export const CIVIC_SECTORS: readonly CivicSector[] = [
  { id: 'agriculture', icon: 'Tractor', nameEn: 'Agriculture & Rural', nameHi: 'कृषि एवं ग्रामीण', category: 'agriculture', color: '#2E7D32' },
  { id: 'welfare', icon: 'HeartHandshake', nameEn: 'Social Welfare', nameHi: 'सामाजिक कल्याण', category: 'welfare', color: '#EF6C00' },
  { id: 'education', icon: 'GraduationCap', nameEn: 'Education', nameHi: 'शिक्षा', category: 'education', color: '#1565C0' },
  { id: 'msme', icon: 'Briefcase', nameEn: 'Business & MSME', nameHi: 'व्यवसाय एवं MSME', category: 'msme', color: '#6A1B9A' },
  { id: 'women', icon: 'Baby', nameEn: 'Women & Child', nameHi: 'महिला एवं बाल', category: 'women', color: '#C2185B' },
  { id: 'skills', icon: 'Wrench', nameEn: 'Skills & Jobs', nameHi: 'कौशल एवं रोजगार', category: 'skills', color: '#00897B' },
  { id: 'banking', icon: 'Landmark', nameEn: 'Banking & Insurance', nameHi: 'बैंकिंग एवं बीमा', category: 'banking', color: '#1A237E' },
  { id: 'health', icon: 'Activity', nameEn: 'Health', nameHi: 'स्वास्थ्य', category: 'health', color: '#C62828' },
  { id: 'housing', icon: 'Home', nameEn: 'Housing', nameHi: 'आवास', category: 'housing', color: '#6D4C41' },
  { id: 'sports', icon: 'Trophy', nameEn: 'Sports & Culture', nameHi: 'खेल एवं संस्कृति', category: 'sports', color: '#F9A825' },
  { id: 'science', icon: 'Cpu', nameEn: 'Science & IT', nameHi: 'विज्ञान एवं आईटी', category: 'science', color: '#0277BD' },
  { id: 'transport', icon: 'Truck', nameEn: 'Transport', nameHi: 'परिवहन', category: 'transport', color: '#455A64' },
  { id: 'tourism', icon: 'MapPin', nameEn: 'Travel & Tourism', nameHi: 'यात्रा एवं पर्यटन', category: 'tourism', color: '#AD1457' },
  { id: 'jal', icon: 'Droplets', nameEn: 'Water & Sanitation', nameHi: 'जल एवं स्वच्छता', category: 'jal', color: '#00838F' },
  { id: 'legal', icon: 'Scale', nameEn: 'Legal Aid', nameHi: 'विधिक सहायता', category: 'legal', color: '#283593' },
  { id: 'artisans', icon: 'Hammer', nameEn: 'Artisans', nameHi: 'कारीगर', category: 'artisans', color: '#FF8F00' },
  { id: 'disaster', icon: 'AlertOctagon', nameEn: 'Disaster Relief', nameHi: 'आपदा राहत', category: 'disaster', color: '#B71C1C' },
  { id: 'gig', icon: 'Bike', nameEn: 'Gig & Labour', nameHi: 'गिग एवं श्रम', category: 'gig', color: '#558B2F' },
];
