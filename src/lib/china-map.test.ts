import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cityMatches,
  getChineseCityName,
  mapProjection,
  OUTLINE_ONLY,
  regionMatches,
  regionPattern,
} from './china-map';

describe('China map location matching', () => {
  it('accepts alpha and legacy numeric region codes without confusing provinces', () => {
    for (const code of ['CN-GD', 'CN-44', 'GD', '44'])
      expect(regionMatches(code, 440000)).toBe(true);
    expect(regionMatches('CN-GX', 440000)).toBe(false);
    expect(regionMatches('CN-SN', 140000)).toBe(false);
    expect(regionMatches('CN-SN', 610000)).toBe(true);
  });
  it('uses the same region aliases in the server drilldown filter', () => {
    const pattern = new RegExp(regionPattern(440000).slice(3));
    expect(pattern.test('CN-GD')).toBe(true);
    expect(pattern.test('CN-44')).toBe(true);
    expect(pattern.test('CN-GX')).toBe(false);
  });
  it('matches Chinese, English and common IP location spellings', () => {
    for (const name of ['广州市', '广州', 'Guangzhou'])
      expect(cityMatches(name, 440100)).toBe(true);
    expect(cityMatches("Xi'an", 610100)).toBe(true);
    expect(cityMatches('Urumqi', 650100)).toBe(true);
    expect(cityMatches('Harbin', 230100)).toBe(true);
    expect(cityMatches('Qiqihar', 230200)).toBe(true);
    expect(getChineseCityName('Harbin')).toBe('哈尔滨');
    expect(getChineseCityName('Guangzhou')).toBe('广州');
    expect(getChineseCityName('Unknown city')).toBe('Unknown city');
    expect(cityMatches('Shenzhen', 440100)).toBe(false);
    expect(cityMatches('', 440100)).toBe(false);
  });
  it('ships every drillable province and fits all shipped maps to a finite projection', () => {
    const root = JSON.parse(fs.readFileSync('public/maps/china/100000.json', 'utf8'));
    for (const feature of root.features) {
      const code = feature.properties.adcode;
      if (typeof code !== 'number' || OUTLINE_ONLY.includes(code)) continue;
      const data = JSON.parse(fs.readFileSync(`public/maps/china/${code}.json`, 'utf8'));
      expect(data.features.length).toBeGreaterThan(0);
      // D3 expects clockwise outer rings; opposite winding fills the globe and blocks clicks.
      for (const feature of data.features) {
        const polygons =
          feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        for (const polygon of polygons) {
          const ring = polygon[0];
          const area = ring
            .slice(0, -1)
            .reduce(
              (sum: number, point: number[], i: number) =>
                sum + point[0] * ring[i + 1][1] - ring[i + 1][0] * point[1],
              0,
            );
          expect(area).toBeLessThanOrEqual(0);
        }
      }
      const projection = mapProjection(data);
      expect(projection.scale).toBeGreaterThan(0);
      expect([...projection.center, projection.scale].every(Number.isFinite)).toBe(true);
    }
    expect(Number.isFinite(mapProjection(root).scale)).toBe(true);
  });
});
