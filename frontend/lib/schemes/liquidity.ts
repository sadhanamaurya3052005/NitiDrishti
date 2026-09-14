import type { SchemeRecord } from '@/types';

/** Only exact “₹N / year” gazette-style strings become a rupee total. Ranges are skipped. */
export function yearlyRupeeBenefit(benefit: string): number | null {
  const match = benefit.match(/₹\s*([\d,]+)\s*\/\s*(year|वर्ष)/i);
  if (!match?.[1]) return null;
  if (benefit.includes('–') || benefit.includes('-') || /lakh|लाख/i.test(benefit)) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

export function stackedYearlyRupees(schemes: SchemeRecord[]): number {
  return schemes.reduce((sum, scheme) => sum + (yearlyRupeeBenefit(scheme.benefit) ?? 0), 0);
}
