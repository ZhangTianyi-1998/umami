import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapLabels, ZoomableMapLabels } from './MapLabels';

const { zoomContext } = vi.hoisted(() => ({ zoomContext: vi.fn() }));
vi.mock('@umami/react-zen', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('react-simple-maps', () => ({
  useZoomPanContext: zoomContext,
  useMapContext: () => ({
    projection: () => [100, 100],
    path: { centroid: () => [100, 100], area: () => 10000 },
  }),
}));
const geographies = [{ rsmKey: 'province', properties: { name: '黑龙江', center: [128, 47] } }];
describe('map labels without a zoom provider', () => {
  beforeEach(() => {
    zoomContext.mockReset();
  });
  it('renders China labels without accessing the required zoom context', () => {
    zoomContext.mockImplementation(() => {
      throw new Error('useZoomPanContext must be used within ZoomPanProvider');
    });
    render(
      <svg>
        <MapLabels geographies={geographies} getName={geo => geo.properties.name} />
      </svg>,
    );
    expect(screen.getByText('黑龙江')).toBeDefined();
    expect(zoomContext).not.toHaveBeenCalled();
  });
  it('scales world labels using the context supplied by ZoomableGroup', () => {
    zoomContext.mockReturnValue({ k: 2 });
    render(
      <svg>
        <ZoomableMapLabels world geographies={geographies} getName={geo => geo.properties.name} />
      </svg>,
    );
    expect(screen.getByText('黑龙江').style.fontSize).toBe('4.5px');
    expect(zoomContext).toHaveBeenCalled();
  });
});
