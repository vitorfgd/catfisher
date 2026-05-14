/**
 * Breach-out end overlay: splash, run summary, CTA to resume boat flow.
 */

import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import {
  FTUE_HAND_BREACH_SPAN_MULT,
  FTUE_HAND_MAX_SPAN_BOAT_PX,
  getFtueHandDrawSize,
} from '../shared/FtueHandLayout';
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
import {
  BREACH_FISH_COUNT_TICK,
  BREACH_REVEAL_BTN_ANIM_DURATION_SEC,
  getBreachRevealSchedule,
} from '../shared/BreachEndRevealTiming';
import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import { Boat, C, t, tb } from './theme';

const DIVE_BTN_CORNER_R = 14;
const STATS_PANEL_CORNER_R = 18;

const STAT_BLOCK_H =
  BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP + BREACH_END_STAT_VALUE_H;

const REVEAL_HEADER = { delay: 0.06, dur: 0.36 } as const;
const REVEAL_PANEL = { delay: 0.4, dur: 0.34 } as const;
const TIME_ROW_POP_DUR = 0.46;
const MONEY_ROW_POP_DUR = 0.48;

/** easeOutBack magnitude — header, panel, time row, money row, CTA. */
const REVEAL_BACK = [1.22, 1.48, 1.72, 2.02, 1.82] as const;

function easeOutBack01(t: number, overshoot: number): number {
  const s = overshoot;
  return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
}

function stepPop(elapsed: number, t0: number, dur: number, back: number): number {
  const u = (elapsed - t0) / dur;
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return easeOutBack01(u, back);
}

function stepScale(elapsed: number, t0: number, dur: number, back: number): number {
  return Math.max(0.045, stepPop(elapsed, t0, dur, back));
}

function frac01(v: number): number {
  return v - Math.floor(v);
}

/** When summary is skipped, pretend this many seconds elapsed so all beats read as finished. */
const BREACH_SUMMARY_ELAPSED_SKIP = 1e6;

/** Integer 0 → target over `dur` with ease-out (used for time sec + money). */
function rampInt(elapsed: number, t0: number, dur: number, target: number): number {
  const ti = Math.max(0, Math.floor(target));
  if (ti <= 0) return 0;
  if (elapsed < t0) return 0;
  if (dur <= 1e-6) return ti;
  const u = Math.min(1, (elapsed - t0) / dur);
  const e = 1 - (1 - u) ** 2.15;
  return Math.min(ti, Math.floor(e * ti + 1e-7));
}

/** Fountain behind stats panel: each coin has fixed spawn time so motion does not loop / restart. */
function drawBreachEndCoinFountain(
  renderer: GameRenderer,
  elapsed: number,
  animStart: number,
  animEnd: number,
  originX: number,
  originY: number,
  earnings: number,
): void {
  if (elapsed < animStart - 0.02) return;
  if (elapsed > animEnd + 0.88) return;
  const seed = Math.imul(earnings | 0, 92837111) ^ 0x9e3779b9;
  const span = Math.max(1e-3, animEnd - animStart);
  const n = 104;
  for (let i = 0; i < n; i += 1) {
    const u = frac01(i * 0.6180339887 + seed * 3e-9);
    const spawn = animStart + u * span * 0.96;
    const life = 0.55 + frac01(i * 0.37 + seed * 2e-9) * 0.34;
    if (elapsed < spawn) continue;
    const tAge = elapsed - spawn;
    if (tAge > life) continue;

    const ide = i;
    const spread = (frac01(ide * 0.271 + seed * 1e-9) - 0.5) * 2.85;
    const ang = -Math.PI / 2 + spread;
    const speed = 300 + frac01(ide * 0.19 + seed * 2e-9) * 380;
    const vx = Math.cos(ang) * speed * 0.68;
    const vy = Math.sin(ang) * speed * 1.02;
    const g = 340;
    const x = originX + vx * tAge + Math.sin(tAge * 9 + ide) * 12;
    const y = originY + vy * tAge + g * tAge * tAge;
    const sz = 30 + (ide % 5) * 5;
    const aIn = Math.min(1, tAge * 7.5);
    const uLife = Math.min(1, tAge / life);
    const aOut = 1 - uLife * uLife;
    const alpha = Math.max(0, Math.min(1, aIn * aOut));
    if (alpha < 0.03) continue;
    renderer.drawImageAlpha({ id: AssetIds.iconCoin }, x - sz / 2, y - sz / 2, sz, sz, alpha);
  }
}

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
  const skip = state.breachSummaryAnimationsSkipped;
  const elapsedRaw = state.diveTransition?.breachEndSummaryElapsed ?? 0;
  const catchN = Math.max(0, Math.floor(state.sessionCatchCount));
  const targetSec = Math.max(0, Math.floor(state.actionSessionTime));
  const targetMoney = Math.max(0, Math.floor(state.sessionEarnings));
  const sch = getBreachRevealSchedule(catchN, state.actionSessionTime, state.sessionEarnings);
  const elapsed = skip ? BREACH_SUMMARY_ELAPSED_SKIP : elapsedRaw;

  renderer.pushOpacity(alpha);
  renderer.drawRectAlpha(C.bg, 0.52, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const splash = getBreachEndSplashDrawRect();
  const headerY = splash.y + splash.h + BREACH_END_GAP_BELOW_SPLASH;
  const titleFont = 42;
  const statHeaderColor = Boat.sectionSand;
  const labelStyle = t(16, statHeaderColor, 'center', '700');
  const valueStyle = tb(26, C.white, 'center');

  const yFish = getBreachEndFirstStatLabelY();
  const yTime = yFish + STAT_BLOCK_H + BREACH_END_STAT_BLOCK_GAP;
  const yMoney = yTime + STAT_BLOCK_H + BREACH_END_STAT_BLOCK_GAP;

  const statsPanel = getBreachEndStatsPanelRect();
  const statsTextX = statsPanel.x + BREACH_END_STATS_PANEL_PAD_X;
  const statsTextW = statsPanel.w - BREACH_END_STATS_PANEL_PAD_X * 2;

  const sHeader = stepScale(elapsed, REVEAL_HEADER.delay, REVEAL_HEADER.dur, REVEAL_BACK[0]);
  const headerCx = CANVAS_WIDTH / 2;
  const headerCy = (splash.y + splash.h * 0.5 + headerY + BREACH_END_TITLE_BAND_H * 0.5) / 2;
  renderer.pushScale(sHeader, sHeader, headerCx, headerCy);
  renderer.drawImage({ id: AssetIds.endscreenSplashArt }, splash.x, splash.y, splash.w, splash.h);
  renderer.drawText('DIVE COMPLETE!', 0, headerY, CANVAS_WIDTH, BREACH_END_TITLE_BAND_H, tb(titleFont, C.white, 'center'));
  renderer.pop();

  if (!skip) {
    const moneyCountEnd = sch.moneyCountStart + sch.moneyCountDur;
    const bagEmitX = statsPanel.x + statsPanel.w * 0.5;
    const bagEmitY = statsPanel.y + statsPanel.h - 8;
    drawBreachEndCoinFountain(
      renderer,
      elapsedRaw,
      sch.moneyCountStart,
      moneyCountEnd,
      bagEmitX,
      bagEmitY,
      state.sessionEarnings,
    );
  }

  const sPanel = stepScale(elapsed, REVEAL_PANEL.delay, REVEAL_PANEL.dur, REVEAL_BACK[1]);
  const pcx = statsPanel.x + statsPanel.w / 2;
  const pcy = statsPanel.y + statsPanel.h / 2;
  renderer.pushScale(sPanel, sPanel, pcx, pcy);
  renderer.drawRoundRectAlpha('#000000', 0.42, statsPanel.x, statsPanel.y + 4, statsPanel.w, statsPanel.h, STATS_PANEL_CORNER_R);
  renderer.drawRoundRect(Boat.card, statsPanel.x, statsPanel.y, statsPanel.w, statsPanel.h, STATS_PANEL_CORNER_R);
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.08, statsPanel.x + 3, statsPanel.y + 3, statsPanel.w - 6, 24, 13);
  renderer.drawRectAlpha(
    Boat.cardLine,
    0.65,
    statsPanel.x + STATS_PANEL_CORNER_R,
    statsPanel.y + 1,
    statsPanel.w - STATS_PANEL_CORNER_R * 2,
    1,
  );
  let y = yFish;
  renderer.drawText('FISH CAUGHT', statsTextX, y, statsTextW, BREACH_END_STAT_LABEL_H, labelStyle);
  y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP;
  if (elapsed >= sch.fishCountStart) {
    const tick = Math.floor((elapsed - sch.fishCountStart) / BREACH_FISH_COUNT_TICK);
    const shown = Math.min(catchN, Math.max(0, tick));
    renderer.drawText(`${shown}`, statsTextX, y, statsTextW, BREACH_END_STAT_VALUE_H, valueStyle);
  }
  renderer.pop();

  const sTime = stepScale(elapsed, sch.timeT0, TIME_ROW_POP_DUR, REVEAL_BACK[2]);
  const timeMidY = yTime + STAT_BLOCK_H / 2;
  renderer.pushScale(sTime, sTime, statsTextX + statsTextW / 2, timeMidY);
  y = yTime;
  renderer.drawText('TIME UNDERWATER', statsTextX, y, statsTextW, BREACH_END_STAT_LABEL_H, labelStyle);
  y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP;
  const shownSec = rampInt(elapsed, sch.timeCountStart, sch.timeCountDur, targetSec);
  renderer.drawText(formatUnderwaterTime(shownSec), statsTextX, y, statsTextW, BREACH_END_STAT_VALUE_H, valueStyle);
  renderer.pop();

  const sMoney = stepScale(elapsed, sch.moneyT0, MONEY_ROW_POP_DUR, REVEAL_BACK[3]);
  const moneyMidY = yMoney + STAT_BLOCK_H / 2;
  renderer.pushScale(sMoney, sMoney, statsTextX + statsTextW / 2, moneyMidY);
  y = yMoney;
  renderer.drawText('MONEY EARNED', statsTextX, y, statsTextW, BREACH_END_STAT_LABEL_H, labelStyle);
  y += BREACH_END_STAT_LABEL_H + BREACH_END_STAT_LABEL_TO_VALUE_GAP;
  const shownMoney = rampInt(elapsed, sch.moneyCountStart, sch.moneyCountDur, targetMoney);
  renderer.drawText(`$${shownMoney}`, statsTextX, y, statsTextW, BREACH_END_STAT_VALUE_H, valueStyle);
  renderer.pop();

  const btn = getBreachAndUpgradeButtonLayout();
  const btnAnimDone = skip || elapsedRaw >= sch.btnT0 + BREACH_REVEAL_BTN_ANIM_DURATION_SEC;
  if (btnAnimDone) {
    if (skip) {
      drawDiveStylePrimaryButton(renderer, btn.x, btn.y, btn.w, btn.h, 'BACK TO BOAT', 22);
    } else {
      const sBtn = stepScale(elapsed, sch.btnT0, BREACH_REVEAL_BTN_ANIM_DURATION_SEC, REVEAL_BACK[4]);
      const btnCx = btn.x + btn.w / 2;
      const btnCy = btn.y + btn.h / 2;
      renderer.pushScale(sBtn, sBtn, btnCx, btnCy);
      drawDiveStylePrimaryButton(renderer, btn.x, btn.y, btn.w, btn.h, 'BACK TO BOAT', 22);
      renderer.pop();
    }
  }

  if (btnAnimDone) {
    const press = (Date.now() % 380) / 380;
    const dip = (press < 0.16 ? press / 0.16 : 1 - (press - 0.16) / 0.84) * 9;
    const tipX = btn.x + btn.w * 0.16;
    const tipY = btn.y + btn.h * 0.5 + dip;
    const handSpan = Math.round(FTUE_HAND_MAX_SPAN_BOAT_PX * FTUE_HAND_BREACH_SPAN_MULT);
    const { w: hw, h: hh } = getFtueHandDrawSize(handSpan);
    renderer.pushRotate(30, tipX, tipY);
    renderer.drawImage({ id: AssetIds.ftueHand }, tipX - 0.88 * hw, tipY - 0.5 * hh, hw, hh);
    renderer.pop();
  }

  renderer.popOpacity();
}
