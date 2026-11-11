import aliases from './china-city-aliases.json';

// ISO 3166-2 alpha codes and legacy numeric codes used by IP databases.
export const CHINA_REGIONS: Record<string, string> = {
  '11': 'BJ',
  '12': 'TJ',
  '13': 'HE',
  '14': 'SX',
  '15': 'NM',
  '21': 'LN',
  '22': 'JL',
  '23': 'HL',
  '31': 'SH',
  '32': 'JS',
  '33': 'ZJ',
  '34': 'AH',
  '35': 'FJ',
  '36': 'JX',
  '37': 'SD',
  '41': 'HA',
  '42': 'HB',
  '43': 'HN',
  '44': 'GD',
  '45': 'GX',
  '46': 'HI',
  '50': 'CQ',
  '51': 'SC',
  '52': 'GZ',
  '53': 'YN',
  '54': 'XZ',
  '61': 'SN',
  '62': 'GS',
  '63': 'QH',
  '64': 'NX',
  '65': 'XJ',
};
export const OUTLINE_ONLY = [110000, 120000, 310000, 500000, 710000, 810000, 820000];
export type ChinaMetric = { x: string; y: number; country?: string };
export function regionMatches(value: string, adcode: number) {
  const code = String(adcode).slice(0, 2);
  return [code, `CN-${code}`, CHINA_REGIONS[code], `CN-${CHINA_REGIONS[code]}`].includes(value);
}
export function regionPattern(adcode: number) {
  const code = String(adcode).slice(0, 2);
  return `re.^(CN-)?(${code}|${CHINA_REGIONS[code]})$`;
}
export function normalizeCity(value: string) {
  return (
    value
      ?.toLowerCase()
      .replace(/市$/u, '')
      .replace(/[\s'’-]/g, '') || ''
  );
}
const extraAliases: Record<string, string[]> = {
  '230100': ['Harbin'],
  '230200': ['Qiqihar'],
  '150100': ['Hohhot', 'Huhehaote'],
  '150700': ['Hulunbuir'],
  '150800': ['Bayannur'],
  '150900': ['Ulanqab'],
  '152200': ['Hinggan'],
  '152500': ['Xilingol'],
  '152900': ['Alxa'],
  '650400': ['Turpan'],
  '650500': ['Hami'],
  '653100': ['Kashgar', 'Kashi'],
  '652900': ['Aksu'],
  '653200': ['Hotan'],
  '540200': ['Shigatse'],
  '540300': ['Chamdo'],
  '540400': ['Nyingchi'],
  '540500': ['Shannan', 'Lhokha'],
  '540600': ['Nagqu'],
  '150200': ['Baotou'],
  '350200': ['Amoy'],
  '540100': ['Lhasa'],
  '650100': ['Urumqi', 'Ürümqi'],
};
export function cityMatches(value: string, adcode: number) {
  return [...(aliases[String(adcode)] || []), ...(extraAliases[String(adcode)] || [])].some(
    name => normalizeCity(name) === normalizeCity(value),
  );
}
// Fit a Mercator projection to the actual coordinates, including island geometries.
export function mapProjection(data: any) {
  const points: number[][] = [];
  function visit(coords: any[]) {
    if (typeof coords[0] === 'number') points.push(coords as number[]);
    else coords.forEach(visit);
  }
  data.features.forEach((f: any) => {
    visit(f.geometry.coordinates);
  });
  const rad = Math.PI / 180;
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
  const xs = points.map(p => p[0] * rad);
  const ys = points.map(p => mercator(p[1]));
  const left = xs.reduce((a, b) => Math.min(a, b), Infinity),
    right = xs.reduce((a, b) => Math.max(a, b), -Infinity);
  const bottom = ys.reduce((a, b) => Math.min(a, b), Infinity),
    top = ys.reduce((a, b) => Math.max(a, b), -Infinity);
  return {
    center: [
      (left + right) / 2 / rad,
      (2 * Math.atan(Math.exp((bottom + top) / 2)) - Math.PI / 2) / rad,
    ] as [number, number],
    scale: Math.min(740 / (right - left), 420 / (top - bottom)),
  };
}

// Only translate unambiguous names; preserve unknown provider values.
const cityNames = new Map<string, string | null>();
for (const [code, names] of Object.entries(aliases)) {
  for (const name of [...names, ...(extraAliases[code] || [])]) {
    const key = normalizeCity(name);
    const label = names[0].replace(/市$/u, '');
    cityNames.set(key, cityNames.has(key) && cityNames.get(key) !== label ? null : label);
  }
}
export function getChineseCityName(value: string) {
  return cityNames.get(normalizeCity(value)) || value;
}
