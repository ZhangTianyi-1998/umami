import { Column, type ColumnProps, useTheme } from '@umami/react-zen';
import { colord } from 'colord';
import { type CSSProperties, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import {
  useCountryNames,
  useLocale,
  useMessages,
  useWebsiteMetricsQuery,
} from '@/components/hooks';
import { getThemeColors } from '@/lib/colors';
import { ISO_COUNTRIES, MAP_FILE } from '@/lib/constants';
import { percentFilter } from '@/lib/filters';
import { formatLongNumber } from '@/lib/format';
import { ChinaMap } from './ChinaMap';
import { ZoomableMapLabels } from './MapLabels';
import { MapTooltip, type MapTooltipPosition } from './MapTooltip';
import styles from './WorldMap.module.css';

export interface WorldMapProps extends ColumnProps {
  websiteId?: string;
  data?: any[];
  demo?: boolean;
}

export function WorldMap({ websiteId, data, demo = false, ...props }: WorldMapProps) {
  const [world, setWorld] = useState(!!data);
  if (!world && (websiteId || demo))
    return <ChinaMap websiteId={websiteId} demo={demo} onWorld={() => setWorld(true)} {...props} />;
  return (
    <Column {...props}>
      {(websiteId || demo) && (
        <button
          type="button"
          style={{ alignSelf: 'flex-start', margin: 16 }}
          onClick={() => setWorld(false)}
        >
          查看中国
        </button>
      )}
      <div style={{ padding: '0 16px', fontSize: 12 }}>
        滚轮放大可显示更多国家名称，拖动查看其他区域。
      </div>
      <CountryMap
        onChina={websiteId || demo ? () => setWorld(false) : undefined}
        websiteId={websiteId}
        data={
          demo
            ? [
                { x: 'CN', y: 258600 },
                { x: 'US', y: 32800 },
                { x: 'JP', y: 12600 },
                { x: 'DE', y: 8600 },
              ]
            : data
        }
      />
    </Column>
  );
}

function CountryMap({
  websiteId,
  data,
  onChina,
  ...props
}: WorldMapProps & { onChina?: () => void }) {
  const [tooltip, setTooltipPopup] = useState('');
  const [position, setPosition] = useState<MapTooltipPosition>(null);
  const [selection, setSelection] = useState('');
  const { theme } = useTheme();
  const { colors } = getThemeColors(theme);
  const { locale } = useLocale();
  const { t, labels } = useMessages();
  const { countryNames } = useCountryNames(locale);
  const visitorsLabel = t(labels.visitors).toLocaleLowerCase(locale);
  const unknownLabel = t(labels.unknown);
  const countryLabels = useMemo(() => new Intl.DisplayNames(['zh-CN'], { type: 'region' }), []);
  const getCountryName = (code: string) =>
    /^[A-Z]{2}$/.test(code || '') ? countryLabels.of(code) : unknownLabel;

  const { data: mapData } = useWebsiteMetricsQuery(websiteId, {
    type: 'country',
  });

  const metrics = useMemo(
    () => (data || mapData ? percentFilter((data || mapData) as any[]) : []),
    [data, mapData],
  );

  const getFillColor = (code: string) => {
    if (code === 'AQ') return;
    const country = metrics?.find(({ x }) => x === code);

    if (!country) {
      return colors.map.fillColor;
    }

    return colord(colors.map.baseColor)
      [theme === 'light' ? 'lighten' : 'darken'](0.4 * (1.0 - country.z / 100))
      .toHex();
  };

  const getOpacity = (code: string) => {
    return code === 'AQ' ? 0 : 1;
  };

  const handleHover = (code: string) => {
    if (code === 'AQ') return;
    const country = metrics?.find(({ x }) => x === code);
    setTooltipPopup(
      `${getCountryName(code) || countryNames[code] || unknownLabel}: ${formatLongNumber(
        country?.y || 0,
      )} ${visitorsLabel}${code === 'CN' && onChina ? '\n点击查看中国省市' : ''}`,
    );
  };

  return (
    <Column
      {...props}
      data-tip=""
      data-for="world-map-tooltip"
      style={
        {
          margin: 'auto 0',
          overflow: 'hidden',
          '--map-hover-color': colors.map.hoverColor,
        } as CSSProperties
      }
    >
      <ComposableMap projection="geoMercator">
        <ZoomableGroup zoom={0.8} minZoom={0.7} center={[0, 40]}>
          <Geographies geography={`${process.env.basePath || ''}${MAP_FILE}`}>
            {({ geographies }) => {
              return (
                <>
                  {' '}
                  {geographies.map(geo => {
                    const code = ISO_COUNTRIES[geo.id];

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        className={styles.geography}
                        fill={getFillColor(code)}
                        stroke={colors.map.strokeColor}
                        opacity={getOpacity(code)}
                        style={{
                          default: {
                            outline: 'none',
                            cursor: code === 'CN' && onChina ? 'pointer' : 'default',
                          },
                          hover: { outline: 'none' },
                          pressed: { outline: 'none' },
                        }}
                        role={code === 'CN' && onChina ? 'button' : 'img'}
                        aria-label={getCountryName(code) || unknownLabel}
                        tabIndex={code === 'AQ' ? -1 : 0}
                        onMouseEnter={e => {
                          handleHover(code);
                          setPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={e => setPosition({ x: e.clientX, y: e.clientY })}
                        onClick={() => {
                          if (code === 'CN' && onChina) onChina();
                          else if (code !== 'AQ')
                            setSelection(
                              `${getCountryName(code)}: ${formatLongNumber(metrics.find(row => row.x === code)?.y || 0)} ${visitorsLabel}`,
                            );
                        }}
                        onKeyDown={e => {
                          if (code === 'CN' && onChina && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onChina();
                          }
                        }}
                        onMouseLeave={() => setTooltipPopup('')}
                      />
                    );
                  })}
                  <ZoomableMapLabels
                    world
                    onLeave={() => setTooltipPopup('')}
                    onHover={(geo, event) => {
                      handleHover(ISO_COUNTRIES[geo.id]);
                      setPosition({ x: event.clientX, y: event.clientY });
                    }}
                    onSelect={geo => {
                      const code = ISO_COUNTRIES[geo.id];
                      if (code === 'CN' && onChina) onChina();
                      else
                        setSelection(
                          `${getCountryName(code)}: ${formatLongNumber(metrics.find(row => row.x === code)?.y || 0)} ${visitorsLabel}`,
                        );
                    }}
                    geographies={geographies}
                    getName={geo => {
                      const code = ISO_COUNTRIES[geo.id];
                      return code && code !== 'AQ' ? getCountryName(code) : '';
                    }}
                  />
                </>
              );
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {selection && (
        <div role="status" style={{ padding: 12 }}>
          {selection}
        </div>
      )}
      <MapTooltip text={tooltip} position={position} />
    </Column>
  );
}
