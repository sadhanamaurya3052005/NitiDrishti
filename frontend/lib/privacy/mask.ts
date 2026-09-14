/** DPDP / Aadhaar Act Sec 29 display rule: never keep or show a full national ID. */
export function maskIdentity(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-4);
  if (!digits) return '';
  return `XXXX-XXXX-${digits.padStart(4, '0')}`;
}

export function lastFourDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(-4);
}
