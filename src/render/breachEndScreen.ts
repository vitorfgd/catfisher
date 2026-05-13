/**
 * Breach-out end overlay: splash, run summary, CTA to resume boat flow.
 */

import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import {
  BREACH_END_GAP_BELOW_SPLASH,
  BREACH_END_STAT_BLOCK_GAP,
  BREACH_END_STAT_LABEL_H,
  BREACH_END_STAT_LABEL_TO_VALUE_GAP,
  BREACH_END_STAT_VALUE_H,
  BREACH_END_STATS_PANEL_PAD_X,
  BREACH_END_TITLE_BAND_H,
  getBreachAndUpgradeButtonLayout,
  getBreachEndFirstStatLabelY,
  getBreachEndSplashDrawRect,
  getBreachEndStatsPanelRect,
} from '../shared/BreachEndScreenLayout';
import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import { Boat, C, t, tb } from './theme';

const DIVE_BTN_CORNER_R = 14;
const STATS_PANEL_CORNER_R = 18;

function drawDiveStylePrimaryButton(
  renderer: GameRenderer,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fontSize: number,
): void {
  const shadowOffset = Math.max(2, 10);
  renderer.drawRoundRect(Boat.diveShadow, x, y + shadowOffset, w, h, DIVE_BTN_CORNER_R);
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.11, x - 4, y - 4, w + 8, h + 8, 16);
  renderer.drawRoundRect(Boat.dive, x, y, w, h, DIVE_BTN_CORNER_R);
  const flatW = w - 2 * DIVE_BTN_CORNER_R;
  if (flatW > 0) {
    renderer.drawRect(Boat.diveTopBevel, x + DIVE_BTN_CORNER_R, y + 1, flatW, 1);
  }
  const diveHiH = 18;
  const diveHiY = y + (h - diveHiH) / 2;
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.22, x + 3, diveHiY, w - 6, diveHiH, 10);
  renderer.drawText(label, x, y + 3, w, h, {
    ...t(fontSize, Boat.card, 'center', '800'),
    useLayoutMaxWidth: false,
  });
}

function formatUnderwaterTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function drawBreachEndScreenOverlay(renderer: GameRenderer, state: RenderState, alpha: number): void {
  if (alpha <= 0.004) return;
  renderer.pushOpacity(alpha);
  renderer.drawRectAlpha(C.bg, 0.52, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const splash = getBreachEndSplashDrawRect();
  renderer.drawImage({ id: AssetIds.endscreenSplashArt }, splash.x, splash.y, splash.w, splash.h);

  const headerY = splash.y + splash.h + BREACH_END_GAP_BELOW_SPLASH;
  const titleFont = 42;
  renderer.drawText('DIVE COMPLETE!', 0, headerY, CANVAS_WIDTH, BREACH_END_TITLE_BAND_H, tb(titleFont, C.white, 'center'));

  /** Brighter than `Boat.menuAccent` for small caps on dark scrim (matches `Boat.sectionSand`). */
  const statHeaderColor = Boat.sectionSand;
  const labelFont = 16;
  const labelStyle = t(labelFont, statHeaderColor, 'center', '700');
  const valueStyle = tb(26, C.white, 'center');
  let y = getBreachEndFirstStatLabelY();

  const statsPanel = getBreachEndStatsPanelRect();
  const statsTextX = statsPanel.x + BREACH_END_STATS_PANEL_PAD_X;
  const statsTextW = statsPanel.w - BREACH_END_STATS_PANEL_PAD_X * 2;
  renderer.drawRoundRectAlpha('#000000', 0.42, statsPanel.x, statsPanel.y + 4, statsPanel.w, statsPanel.h, STATS_PANEL_CORNER_R);
  renderer.drawRoundRect(Boat.card, statsPanel.x, statsPanel.y, statsPanel.w, statsPanel.h, STATS_PANEL_CORNER_R);
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.08, statsPanel.x + 3, statsPanel.y + 3, statsPanel.w - 6, 24, 13);
  renderer.drawRectAlpha(Boat.cardLine, 0.65, statsPanel.x + STATS_PANEL_CORNER_R, statsPanel.y + 1, statsPanel.w - STATS_PANEL_CORNER_R * 2, 1);

  renderer.drawText('FISH CAUGHT', statsTextX, y, statsTextW, BREACH_END_STAT_LABEL_H, labelStyle);
  y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP;
  renderer.drawText(`${state.sessionCatchCount}`, statsTextX, y, statsTextW, BREACH_END_STAT_VALUE_H, valueStyle);
  y += BREACH_END_STAT_VALUE_H + BREACH_END_STAT_BLOCK_GAP;

  renderer.drawText('TIME UNDERWATER', statsTextX, y, statsTextW, BREACH_END_STAT_LABEL_H, labelStyle);
  y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP;
  renderer.drawText(formatUnderwaterTime(state.actionSessionTime), statsTextX, y, statsTextW, BREACH_END_STAT_VALUE_H, valueStyle);
  y += BREACH_END_STAT_VALUE_H + BREACH_END_STAT_BLOCK_GAP;

  renderer.drawText('MONEY EARNED', statsTextX, y, statsTextW, BREACH_END_STAT_LABEL_H, labelStyle);
  y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP;
  renderer.drawText(`$${state.sessionEarnings}`, statsTextX, y, statsTextW, BREACH_END_STAT_VALUE_H, valueStyle);

  const btn = getBreachAndUpgradeButtonLayout();
  drawDiveStylePrimaryButton(
    renderer,
    btn.x,
    btn.y,
    btn.w,
    btn.h,
    'BREACH & UPGRADE',
    22,
  );

  renderer.popOpacity();
}
