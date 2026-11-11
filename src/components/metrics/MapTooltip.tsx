import { createPortal } from 'react-dom';

export type MapTooltipPosition = { x: number; y: number };
export function MapTooltip({ text, position }: { text: string; position: MapTooltipPosition }) {
  if (!text || !position) return null;
  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(position.x + 14, window.innerWidth - 260)),
        top: Math.max(8, Math.min(position.y + 14, window.innerHeight - 80)),
        zIndex: 10000,
        pointerEvents: 'none',
        background: 'rgba(20, 28, 40, 0.95)',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-line',
        boxShadow: '0 4px 16px #0003',
        maxWidth: 240,
      }}
    >
      {text}
    </div>,
    document.body,
  );
}
