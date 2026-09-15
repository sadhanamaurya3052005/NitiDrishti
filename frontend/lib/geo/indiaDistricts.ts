/** Join client GeoJSON/TopoJSON properties to DB districts by name — not by invented codes. */

/** covid19india-react public/maps/india.json — open district TopoJSON, ~480KB. */
export const INDIA_DISTRICTS_MAP = '/maps/india_districts.json';

const STATE_ALIASES: Record<string, string> = {
  orissa: 'odisha',
  pondicherry: 'puducherry',
  'nct of delhi': 'delhi',
  'nct delhi': 'delhi',
  'delhi nct': 'delhi',
  'jammu & kashmir': 'jammu and kashmir',
  'andaman & nicobar': 'andaman and nicobar islands',
  'andaman and nicobar': 'andaman and nicobar islands',
  'andaman and nicobar islands': 'andaman and nicobar islands',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
  'daman and diu': 'dadra and nagar haveli and daman and diu',
  'dadra & nagar haveli': 'dadra and nagar haveli and daman and diu',
  uttaranchal: 'uttarakhand',
};

export function normalizePlace(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bdist(rict)?\b/g, '')
    .trim();
}

export function normalizeState(value: string | null | undefined): string {
  const key = normalizePlace(value);
  return STATE_ALIASES[key] ?? key;
}

export function placeKey(state: string | null | undefined, district: string | null | undefined): string {
  return `${normalizeState(state)}::${normalizePlace(district)}`;
}

const DISTRICT_KEYS = [
  'district',
  'DISTRICT',
  'District',
  'dtname',
  'DTNAME',
  'DIST_NAME',
  'district_name',
  'NAME_2',
  'name',
  'NAME',
];

const STATE_KEYS = ['st_nm', 'ST_NM', 'STATE', 'state', 'State', 'STATENAME', 'NAME_1', 'stname', 'STNAME'];

function firstProp(properties: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!properties) return '';
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function geoDistrictName(properties: Record<string, unknown> | null | undefined): string {
  return firstProp(properties, DISTRICT_KEYS);
}

export function geoStateName(properties: Record<string, unknown> | null | undefined): string {
  return firstProp(properties, STATE_KEYS);
}

export function geoPlaceKey(properties: Record<string, unknown> | null | undefined): string {
  return placeKey(geoStateName(properties), geoDistrictName(properties));
}
