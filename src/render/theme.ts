import type { TextStyle } from './GameRenderer';

type TextStyleOverride = Partial<TextStyle>;

// Every color achieves >= 4.5:1 contrast against C.bg
export const C = {
  bg: '#030A10',
  panel: '#060E18',
  border: '#172129',
  white: '#FFFFFF',
  gold: '#FFD040',
  teal: '#cb7400',
  tealDk: '#763b00',
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
  shell: '#002b37',       // main deck
  shellAlpha: 0.93,
  shellRim: '#1A3D44',    // inner edge
  card: '#0C1C2C',        // generic card / text (e.g. GO FISH label); not main menu row fill
  rowCard: '#28292a',     // upgrade + gear list row background
  /** Top-edge bevel line on upgrade / gear rows (`boatScreen` helper). */
  rowCardTopEdge: '#575557',
  cardLine: '#1E3348',
  statsCard: '#002c37',
  statsAlpha: 0.94,
  labelMuted: '#cdbd94',
  labelBright: '#cd8906',
  sectionMint: '#cb7400',
  sectionSand: '#FFB14A',
  /** Bank $, UPGRADES/GEAR headers, filled pips. */
  menuAccent: '#f59c00',
  dive: '#f59c00',
  diveShadow: '#b86800',
  /** GO FISH top-edge highlight — lighter than {@link Boat.dive} for bevel read. */
  diveTopBevel: '#ffc34d',
  diveHi: 'rgba(255, 255, 255, 0.34)',
  /** Radial icon plate on boat upgrade / gear list rows (center → edge). */
  iconSquareCenter: '#0a2b29',
  iconSquareEdge: '#143c39',
  /** Solid fallback / detail-panel large sprite frame (matches edge). */
  iconSquare: '#143c39',
  /** Unfilled level / stock pips (locked or empty) — visible on dark cards. */
  pipEmpty: '#444031',
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
