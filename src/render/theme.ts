import type { TextStyle } from './GameRenderer';

// Every color achieves >= 4.5:1 contrast against C.bg
export const C = {
  bg: '#030A10',
  panel: '#060E18',
  border: '#152535',
  white: '#FFFFFF',
  gold: '#FFD040',
  teal: '#00D4A8',
  tealDk: '#005A44',
  amber: '#FF9020',
  amberDk: '#6B3800',
  blue: '#70C0E8',
  muted: '#6A8EA0',
  ready: '#20F090',
  haul: '#FFD040',
  reload: '#70C0E8',
  warn: '#FFB030',
  danger: '#FF4444',
} as const;

const FONT = "'Outfit', system-ui, sans-serif";

export function t(
  size: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'left',
  weight = '600',
): TextStyle {
  return { fontFamily: FONT, fontWeight: weight, fontSize: size, color, align };
}

export function tb(size: number, color: string, align: 'left' | 'center' | 'right' = 'left'): TextStyle {
  return {
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: size,
    color,
    align,
    strokeColor: C.bg,
    strokeWidth: Math.max(2, Math.round(size * 0.09)),
  };
}

export function td(size: number, color: string, align: 'left' | 'center' | 'right' = 'center'): TextStyle {
  return {
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: size,
    color,
    align,
    strokeColor: C.bg,
    strokeWidth: Math.max(3, Math.round(size * 0.11)),
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowBlur: 12,
  };
}
