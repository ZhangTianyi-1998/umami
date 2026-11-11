import { Column, type ColumnProps, useTheme } from '@umami/react-zen';
import { colord } from 'colord';
import { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { useWebsiteMetricsQuery } from '@/components/hooks';
import {
  cityMatches,
  mapProjection,
  OUTLINE_ONLY,
  regionMatches,
  regionPattern,
} from '@/lib/china-map';
import demoData from '@/lib/china-map-demo.json';
import { getThemeColors } from '@/lib/colors';
import { formatLongNumber } from '@/lib/format';
import { chinaLabel, MapLabels } from './MapLabels';
import { MapTooltip, type MapTooltipPosition } from './MapTooltip';

export function ChinaMap({
  websiteId,
  demo = false,
  onWorld,
  ...props
}: ColumnProps & { websiteId?: string; demo?: boolean; onWorld?: () => void }) {
  const [province, setProvince] = useState<{ adcode: number; name: string }>(null);
  const [geography, setGeography] = useState<any>(null);
  const [mapError, setMapError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [tooltip, setTooltip] = useState('');
  const [position, setPosition] = useState<MapTooltipPosition>(null);
  const [selection, setSelection] = useState('');
  const { theme } = useTheme();
  const { colors } = getThemeColors(theme);
  const adcode = province?.adcode || 100000;
  const { data, isLoading, isPlaceholderData, error, refetch } = useWebsiteMetricsQuery(
    websiteId,
    {
      type: province ? 'city' : 'region',
      limit: 1000,
      country: 'eq.CN',
      ...(province && { region: regionPattern(province.adcode) }),
    },
    { enabled: !!websiteId && !demo },
  );
  useEffect(() => {
    const controller = new AbortController();
    setGeography(null);
    setMapError(false);
    setTooltip('');
    setSelection('');
    fetch(`${process.env.basePath || ''}/maps/china/${adcode}.json`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('map');
        return r.json();
      })
      .then(setGeography)
      .catch(e => {
        if (e.name !== 'AbortError') setMapError(true);
      });
    return () => controller.abort();
  }, [adcode, retry]);
  const projectionConfig = useMemo(
    () => (geography ? mapProjection(geography) : undefined),
    [geography],
  );
  const metrics = demo
    ? province
      ? demoData.cities[province.adcode] || []
      : demoData.regions
    : isPlaceholderData
      ? []
      : data || [];
  const valueFor = (code: number) =>
    metrics
      .filter(row => (province ? cityMatches(row.x, code) : regionMatches(row.x, code)))
      .reduce((sum, row) => sum + Number(row.y), 0);
  const max = geography
    ? Math.max(1, ...geography.features.map((f: any) => valueFor(f.properties.adcode)))
    : 1;
  return (
    <Column {...props} style={{ margin: 'auto 0', overflow: 'hidden', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {province && (
          <button type="button" onClick={() => setProvince(null)}>
            ← 返回全国
          </button>
        )}
        <button type="button" onClick={onWorld} hidden={!onWorld}>
          返回世界
        </button>
        <strong>{province?.name || '中国省级访客分布'}</strong>
      </div>
      <div style={{ fontSize: 12, minHeight: 24 }} aria-live="polite">
        {province
          ? '城市名称无法匹配的访客不着色；IP 定位可能缺失。'
          : '点击省份查看城市；直辖市暂仅展示整体统计。'}
      </div>
      {mapError || (!demo && error) ? (
        <div role="alert">
          地图或统计数据加载失败。
          <button
            type="button"
            onClick={() => {
              setRetry(n => n + 1);
              refetch();
            }}
          >
            重试
          </button>
        </div>
      ) : !geography || (!demo && (isLoading || isPlaceholderData)) ? (
        <div role="status">正在加载地图…</div>
      ) : (
        <>
          <ComposableMap
            width={800}
            height={480}
            projection="geoMercator"
            projectionConfig={projectionConfig}
            style={{ width: '100%', height: 'auto' }}
          >
            <Geographies geography={geography}>
              {({ geographies }) => (
                <>
                  {geographies.map(geo => {
                    const { adcode: code, name } = geo.properties;
                    const value = valueFor(code);
                    const canDrill =
                      !province && typeof code === 'number' && !OUTLINE_ONLY.includes(code);
                    const label =
                      code >= 710000
                        ? `${name}: 暂无定位数据`
                        : `${name}: ${formatLongNumber(value)} 位访客`;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          value
                            ? colord(colors.map.baseColor)
                                [theme === 'light' ? 'lighten' : 'darken'](0.4 * (1 - value / max))
                                .toHex()
                            : colors.map.fillColor
                        }
                        stroke={colors.map.strokeColor}
                        strokeWidth={0.6}
                        tabIndex={name ? 0 : -1}
                        role={name ? 'button' : 'img'}
                        aria-label={label}
                        style={{
                          default: { outline: 'none', cursor: name ? 'pointer' : 'default' },
                          hover: { fill: colors.map.hoverColor },
                          pressed: {},
                        }}
                        onMouseEnter={e => {
                          setTooltip(
                            `${label}${canDrill ? '\n点击查看城市' : province ? '\n点击查看统计详情' : ''}`,
                          );
                          setPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={e => setPosition({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTooltip('')}
                        onFocus={e => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip(label);
                          setPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                        }}
                        onBlur={() => setTooltip('')}
                        onClick={() => {
                          setTooltip('');
                          if (canDrill) setProvince({ adcode: code, name });
                          else if (name)
                            setSelection(`${label}${province ? '（当前统计到市级）' : ''}`);
                        }}
                        onKeyDown={e => {
                          if (name && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setTooltip('');
                            if (canDrill) setProvince({ adcode: code, name });
                            else setSelection(`${label}${province ? '（当前统计到市级）' : ''}`);
                          }
                        }}
                      />
                    );
                  })}
                  <MapLabels
                    geographies={geographies}
                    getName={chinaLabel}
                    onLeave={() => setTooltip('')}
                    onHover={(geo, event) => {
                      const { adcode: code, name } = geo.properties;
                      setTooltip(
                        code >= 710000
                          ? `${name}: 暂无定位数据`
                          : `${name}: ${formatLongNumber(valueFor(code))} 位访客`,
                      );
                      setPosition({ x: event.clientX, y: event.clientY });
                    }}
                    onSelect={geo => {
                      const { adcode: code, name } = geo.properties;
                      setTooltip('');
                      if (!province && typeof code === 'number' && !OUTLINE_ONLY.includes(code))
                        setProvince({ adcode: code, name });
                      else
                        setSelection(
                          code >= 710000
                            ? `${name}: 暂无定位数据`
                            : `${name}: ${formatLongNumber(valueFor(code))} 位访客${province ? '（当前统计到市级）' : ''}`,
                        );
                    }}
                  />
                </>
              )}
            </Geographies>
          </ComposableMap>
          {selection && (
            <div role="status" style={{ padding: 12 }}>
              {selection}
            </div>
          )}
          {metrics.length === 0 && <div>当前筛选范围内暂无中国地区定位数据。</div>}
        </>
      )}
      <MapTooltip text={tooltip} position={position} />
    </Column>
  );
}
