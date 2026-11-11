import { useTheme } from '@umami/react-zen';
import { useMapContext, useZoomPanContext } from 'react-simple-maps';

// Labels share the map projection; pointer events pass through to the regions.
export function MapLabels({
  geographies,
  getName,
  world = false,
  onSelect,
  onHover,
  onLeave,
}: {
  geographies: any[];
  getName: (geo: any) => string;
  world?: boolean;
  onSelect?: (geo: any) => void;
  onHover?: (geo: any, event: React.MouseEvent<SVGTextElement>) => void;
  onLeave?: () => void;
}) {
  const { projection, path } = useMapContext();
  const { k = 1 } = useZoomPanContext() || {};
  const { theme } = useTheme();
  const fontSize = (world ? 9 : 10) / k;
  const placed: { x: number; y: number; width: number; height: number }[] = [];
  const candidates = geographies
    .map(geo => {
      const name = getName(geo);
      const coordinates = geo.properties.centroid || geo.properties.center;
      const [x, y] = coordinates ? projection(coordinates) : path.centroid(geo);
      return { geo, name, x, y, area: path.area(geo) };
    })
    .filter(p => p.name && Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => b.area - a.area);
  return (
    <g aria-hidden="true" pointerEvents="none" style={{ userSelect: 'none' }}>
      {candidates.map(({ geo, name, x, y, area }) => {
        const width =
          [...name].reduce((sum, char) => sum + (/[\u3400-\u9fff]/.test(char) ? 1 : 0.6), 0) *
            fontSize +
          3 / k;
        const height = fontSize + 3 / k;
        if (world && area < width * height * 1.25) return null;
        let position: { x: number; y: number; width: number; height: number };
        for (const dy of world ? [0] : [0, -12, 12, -24, 24, -36, 36]) {
          for (const dx of world ? [0] : [0, -18, 18, -36, 36]) {
            const candidate = { x: x + dx / k, y: y + dy / k, width, height };
            if (
              !placed.some(
                p =>
                  Math.abs(candidate.x - p.x) < (width + p.width) / 2 &&
                  Math.abs(candidate.y - p.y) < (height + p.height) / 2,
              )
            ) {
              position = candidate;
              break;
            }
          }
          if (position) break;
        }
        // Dense world regions reveal more labels as the user zooms in.
        if (!position && world) return null;
        position ||= { x, y, width, height };
        placed.push(position);
        const shifted = Math.hypot(position.x - x, position.y - y) > 10 / k;
        return (
          <g key={geo.rsmKey || geo.properties.adcode}>
            {shifted && (
              <line
                x1={x}
                y1={y}
                x2={position.x}
                y2={position.y}
                stroke={theme === 'dark' ? '#ddd' : '#555'}
                strokeWidth={0.45 / k}
                opacity={0.6}
              />
            )}
            <text
              pointerEvents={onSelect || onHover ? 'auto' : 'none'}
              onClick={() => onSelect?.(geo)}
              onMouseEnter={event => onHover?.(geo, event)}
              onMouseMove={event => onHover?.(geo, event)}
              onMouseLeave={onLeave}
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={theme === 'dark' ? '#f5f5f5' : '#172b4d'}
              stroke={theme === 'dark' ? '#20252b' : '#fff'}
              strokeWidth={2 / k}
              paintOrder="stroke"
              style={{ fontSize, fontWeight: 500, cursor: onSelect ? 'pointer' : 'default' }}
            >
              {name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function chinaLabel(geo: any) {
  return (geo.properties.name || '')
    .replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/u, '')
    .replace(
      /(土家族|苗族|蒙古族|藏族|哈尼族|彝族|傣族|白族|傈僳族|壮族|布依族|侗族|朝鲜族|哈萨克族|柯尔克孜族|回族|景颇族|自治州|地区)$/gu,
      '',
    );
}
