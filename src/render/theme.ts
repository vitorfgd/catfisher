import type { TextStyle } from './GameRenderer';

type TextStyleOverride = Partial<TextStyle>;

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

/** Main menu (boat) — use with drawRoundRect(Alpha) / drawGradientRect. */
export const Boat = {
  shell: '#040F1A',       // main deck
  shellAlpha: 0.93,
  shellRim: '#1A3D44',    // inner edge
  card: '#0C1C2C',        // list row
  cardOpen: '#122A40',
  cardLine: '#1E3348',
  statsCard: '#081824',
  statsAlpha: 0.94,
  labelMuted: '#7FA3B0',
  labelBright: '#E8F4F8',
  sectionMint: '#4BE8C8',
  sectionSand: '#FFB14A',
  dive: '#0EC8A0',
  diveHi: 'rgba(255, 255, 255, 0.2)',
  /** Soft tint behind the consumables area inside the shell */
  gearTint: '#1A0E06',
  /** Unfilled level / stock pips (locked or empty) — visible on dark cards. */
  pipEmpty: '#4A6078',
} as const;

const FONT = "'Outfit', system-ui, sans-serif";

export function t(
  size: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'left',
  weight = '600',
  extra?: TextStyleOverride,
): TextStyle {
  return { fontFamily: FONT, fontWeight: weight, fontSize: size, color, align, ...extra };
}

export function tb(
  size: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'left',
  extra?: TextStyleOverride,
): TextStyle {
  return {
    fontFamily: FONT,
    fontWeight: '800',
    fontSize: size,
    color,
    align,
    strokeColor: C.bg,
    strokeWidth: Math.max(2, Math.round(size * 0.09)),
    ...extra,
  };
}

export function td(
  size: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'center',
  extra?: TextStyleOverride,
): TextStyle {
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
    ...extra,
  };
}
