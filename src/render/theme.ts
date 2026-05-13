import type { TextStyle } from './GameRenderer';

type TextStyleOverride = Partial<TextStyle>;

// Every color achieves >= 4.5:1 contrast against C.bg
export const C = {
  bg: '#030A10',
  panel: '#071321',
  border: '#22303B',
  white: '#FFFFFF',
  gold: '#FFD85A',
  teal: '#D98200',
  tealDk: '#8A4600',
  amber: '#FFA13A',
  amberDk: '#7D4300',
  blue: '#82D2F4',
  muted: '#468696',
  ready: '#36FF9C',
  haul: '#FFD85A',
  reload: '#82D2F4',
  warn: '#FFC04A',
  danger: '#FF5C5C',
} as const;

/** Main menu (boat) — use with drawRoundRect(Alpha) / drawGradientRect. */
export const Boat = {
  shell: '#001e26',       // main deck
  shellAlpha: 0.94,
  shellRim: '#24505A',    // inner edge
  card: '#031a2e',        // generic card / text (e.g. GO FISH label); not main menu row fill
  rowCard: '#2C2926',     // upgrade + gear list row background
  /** Top-edge bevel line on upgrade / gear rows (`boatScreen` helper). */
  rowCardTopEdge: '#64574D',
  cardLine: '#28435C',
  statsCard: '#001724',
  statsAlpha: 0.94,
  labelMuted: '#FFE190',
  labelBright: '#FFAA00',
  sectionMint: '#FF9900',
  sectionSand: '#FFC263',
  /** Bank $, UPGRADES/GEAR headers, filled pips. */
  menuAccent: '#FF9900',
  dive: '#FFA51A',
  diveShadow: '#CF7600',
  /** GO FISH top-edge highlight — lighter than {@link Boat.dive} for bevel read. */
  diveTopBevel: '#FFD066',
  diveHi: 'rgba(255, 255, 255, 0.38)',
  /** Radial icon plate on boat upgrade / gear list rows (center → edge). */
  iconSquareCenter: '#042C29',
  iconSquareEdge: '#0F554F',
  /** Solid fallback / detail-panel large sprite frame (matches edge). */
  iconSquare: '#114743',
  /** Unfilled level / stock pips (locked or empty) — visible on dark cards. */
  pipEmpty: '#55503D',
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
