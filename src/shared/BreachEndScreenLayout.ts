import {
  BOAT_MENU_DIVE_BUTTON_INNER_PAD_X,
  BOAT_SECTION_CONTENT_W,
  BOAT_SECTION_CONTENT_X,
  CANVAS_WIDTH,
  DIVE_BUTTON_HEIGHT,
} from '../core/Constants';

/** Max draw size for end-screen splash art (preserves aspect in renderer). */
export const BREACH_END_SPLASH_MAX_W = CANVAS_WIDTH - 40;
export const BREACH_END_SPLASH_MAX_H = 280;
/** Splash art width/height (bear + net — slightly landscape). */
export const BREACH_END_SPLASH_ASPECT_WH = 1.12;

export const BREACH_END_GAP_BELOW_SPLASH = 18;
/** Vertical band from title top through gap before first stat label (must match `breachEndScreen`). */
export const BREACH_END_TITLE_BAND_H = 68;
export const BREACH_END_STAT_LABEL_H = 22;
export const BREACH_END_STAT_VALUE_H = 38;
export const BREACH_END_STAT_BLOCK_GAP = 22;
export const BREACH_END_STAT_LABEL_TO_VALUE_GAP = 2;
/** Space from title band bottom to top of the stat panel. */
export const BREACH_END_GAP_TITLE_TO_STATS_PANEL = 30;
/** Horizontal padding between stat text bounds and stat panel edge. */
export const BREACH_END_STATS_PANEL_PAD_X = 30;
export const BREACH_END_STATS_PANEL_PAD_TOP = 22;
export const BREACH_END_STATS_PANEL_PAD_BOTTOM = 14;
export const BREACH_END_STATS_TEXT_W = 220;
export const BREACH_END_STATS_PANEL_W = BREACH_END_STATS_TEXT_W + BREACH_END_STATS_PANEL_PAD_X * 2;
/** Space from bottom of stat panel to top of BREACH & UPGRADE button. */
export const BREACH_END_GAP_STATS_PANEL_TO_BUTTON = 30;

export function getBreachEndSplashDrawRect(): { x: number; y: number; w: number; h: number } {
  let w = BREACH_END_SPLASH_MAX_W;
  let h = w / BREACH_END_SPLASH_ASPECT_WH;
  if (h > BREACH_END_SPLASH_MAX_H) {
    h = BREACH_END_SPLASH_MAX_H;
    w = h * BREACH_END_SPLASH_ASPECT_WH;
  }
  const x = (CANVAS_WIDTH - w) / 2;
  const y = 28;
  return { x, y, w, h };
}

/** Y of the first statistic label row (`FISH CAUGHT`), below splash + title band. */
export function getBreachEndFirstStatLabelY(): number {
  const splash = getBreachEndSplashDrawRect();
  const headerY = splash.y + splash.h + BREACH_END_GAP_BELOW_SPLASH;
  return headerY
    + BREACH_END_TITLE_BAND_H
    + BREACH_END_GAP_TITLE_TO_STATS_PANEL
    + BREACH_END_STATS_PANEL_PAD_TOP;
}

/** Bottom edge of the last stat value (`$…`), before the CTA gap. */
export function getBreachEndLastStatValueBottom(): number {
  let y = getBreachEndFirstStatLabelY();
  for (let i = 0; i < 3; i += 1) {
    y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP + BREACH_END_STAT_VALUE_H;
    if (i < 2) y += BREACH_END_STAT_BLOCK_GAP;
  }
  return y;
}

export function getBreachEndStatsPanelRect(): { x: number; y: number; w: number; h: number } {
  const x = (CANVAS_WIDTH - BREACH_END_STATS_PANEL_W) / 2;
  const y = getBreachEndFirstStatLabelY() - BREACH_END_STATS_PANEL_PAD_TOP;
  const h = getBreachEndLastStatValueBottom()
    - getBreachEndFirstStatLabelY()
    + BREACH_END_STATS_PANEL_PAD_TOP
    + BREACH_END_STATS_PANEL_PAD_BOTTOM;
  return { x, y, w: BREACH_END_STATS_PANEL_W, h };
}

/** Primary CTA — same width style as GO FISH; Y sits just below run statistics. */
export function getBreachAndUpgradeButtonLayout(): { x: number; y: number; w: number; h: number } {
  const h = DIVE_BUTTON_HEIGHT;
  const w = BOAT_SECTION_CONTENT_W - 2 * BOAT_MENU_DIVE_BUTTON_INNER_PAD_X;
  const x = BOAT_SECTION_CONTENT_X + BOAT_MENU_DIVE_BUTTON_INNER_PAD_X;
  const panel = getBreachEndStatsPanelRect();
  const y = panel.y + panel.h + BREACH_END_GAP_STATS_PANEL_TO_BUTTON;
  return { x, y, w, h };
}

export function isBreachAndUpgradeButtonHit(lx: number, ly: number): boolean {
  const r = getBreachAndUpgradeButtonLayout();
  return lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h;
}
