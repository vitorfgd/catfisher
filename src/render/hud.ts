import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  OXYGEN_DAMAGE_VFX_SEC,
  PUFFER_TIME_BONUS,
} from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import {
  HUD_BAIT_BUTTON_CX,
  HUD_CONSUMABLE_BUTTON_RADIUS,
  HUD_CONSUMABLE_BUTTON_Y,
  HUD_NET_BUTTON_CX,
} from '../shared/UiLayout';
import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import { C, t, tb, td } from './theme';

const CONSUMABLE_ICON_IDS: Record<'net' | 'bait', string> = {
  net: AssetIds.iconNet,
  bait: AssetIds.iconBait,
};

const MONEY_PILL_Y = 12;
const OXYGEN_TANK_X = 14;
const OXYGEN_TANK_Y = Math.round(CANVAS_HEIGHT * 0.39);
const OXYGEN_TANK_W = 54;
const OXYGEN_TANK_H = 188;
const DEBUG_SHOW_GAMEPLAY_MESSAGES = false;
const FTUE_HAND_PX = 72;
const FTUE_HAND_TIP_X_FR = 0.88;
const FTUE_HAND_TIP_Y_FR = 0.5;
const FTUE_CLICK_DIP_PX = 8;

function ftueClickPressT(): number {
  const phase = (Date.now() / 1000) % 0.86;
  if (phase < 0.16) return phase / 0.16;
  if (phase < 0.26) return 1 - (phase - 0.16) / 0.10;
  return 0;
}

function getFtueConsumableTarget(prompt: RenderState['ftuePrompt']): 'bait' | 'net' | null {
  if (prompt === 'useBait') return 'bait';
  if (prompt === 'useNet') return 'net';
  return null;
}

function drawFtueConsumableHand(renderer: GameRenderer, target: 'bait' | 'net'): void {
  const cx = target === 'bait' ? HUD_BAIT_BUTTON_CX : HUD_NET_BUTTON_CX;
  const cy = HUD_CONSUMABLE_BUTTON_Y;
  const press = ftueClickPressT();
  const tipX = cx;
  const tipY = cy + press * FTUE_CLICK_DIP_PX;
  const drawL = tipX - FTUE_HAND_TIP_X_FR * FTUE_HAND_PX;
  const drawT = tipY - FTUE_HAND_TIP_Y_FR * FTUE_HAND_PX;
  renderer.pushRotate(30, tipX, tipY);
  renderer.drawImage({ id: AssetIds.ftueHand }, drawL, drawT, FTUE_HAND_PX, FTUE_HAND_PX);
  renderer.pop();
}

export function getHudMoneyLayout(moneyDigits: string): {
  mW: number;
  mX: number;
  mY: number;
  pillH: number;
  iconCx: number;
  iconCy: number;
  iconSize: number;
  textX: number;
  textW: number;
} {
  const mX = 12;
  const padX = 10;
  const padY = 6;
  const gap = 6;
  const iconSize = 26;
  /** ~px per digit for `tb(26, …)` coin label (stroke adds a little width). */
  const digitW = 16;
  const textW = Math.max(12, Math.ceil(moneyDigits.length * digitW) + 4);
  const mW = padX + iconSize + gap + textW + padX;
  const pillH = iconSize + padY * 2;
  const mY = MONEY_PILL_Y;
  const iconCx = mX + padX + iconSize / 2;
  const iconCy = mY + pillH / 2;
  const textX = mX + padX + iconSize + gap;
  return { mW, mX, mY, pillH, iconCx, iconCy, iconSize, textX, textW };
}

function drawOxygenTank(renderer: GameRenderer, state: RenderState): void {
  const tFrac = Math.max(0, Math.min(1, state.timeLeftFraction));
  const barColor = tFrac > 0.5 ? C.teal : tFrac > 0.25 ? C.warn : C.danger;
  const secLeft = Math.max(0, Math.ceil(state.roundTimeLeft));
  const damageP = state.oxygenDamageTimer > 0
    ? Math.min(1, state.oxygenDamageTimer / OXYGEN_DAMAGE_VFX_SEC)
    : 0;
  const shake = damageP > 0 ? Math.sin(Date.now() / 24) * 3.5 * damageP : 0;
  const x = OXYGEN_TANK_X + shake;
  const y = OXYGEN_TANK_Y;
  const innerPad = 7;
  const innerX = x + innerPad;
  const innerY = y + 30;
  const innerW = OXYGEN_TANK_W - innerPad * 2;
  const innerH = OXYGEN_TANK_H - 58;
  const fillH = Math.max(6, innerH * tFrac);
  const fillY = innerY + innerH - fillH;

  renderer.drawRoundRectAlpha(C.bg, 0.92, x, y, OXYGEN_TANK_W, OXYGEN_TANK_H, 18);
  renderer.drawRoundRectAlpha(barColor, 0.16 + damageP * 0.16, x - 4, y - 4, OXYGEN_TANK_W + 8, OXYGEN_TANK_H + 8, 20);
  renderer.drawText('O2', x, y + 7, OXYGEN_TANK_W, 22, tb(17, C.white, 'center'));
  renderer.drawRoundRect(C.border, innerX - 2, innerY - 2, innerW + 4, innerH + 4, 12);
  renderer.drawRoundRectAlpha('#06131b', 0.96, innerX, innerY, innerW, innerH, 10);
  renderer.drawRoundRect(barColor, innerX, fillY, innerW, fillH, 9);
  renderer.drawRoundRectAlpha('#ffffff', 0.12, innerX + 4, fillY + 4, Math.max(5, innerW * 0.28), Math.max(5, fillH - 8), 5);
  renderer.drawText(`${secLeft}s`, x, y + OXYGEN_TANK_H - 28, OXYGEN_TANK_W, 22, t(15, C.white, 'center', '800'));

  if (damageP > 0) {
    const a = damageP.toFixed(2);
    renderer.drawRectAlpha(`rgba(255,68,68,${a})`, 0.24, innerX + 6, innerY + 18, innerW - 12, 4);
    renderer.drawRectAlpha(`rgba(255,68,68,${a})`, 0.22, innerX + 18, innerY + 58, 4, 42);
    renderer.drawText(
      `-${state.oxygenDamageAmount}s O2`,
      x + OXYGEN_TANK_W + 6,
      y + 58,
      116,
      30,
      { ...tb(19, `rgba(255,90,70,${a})`, 'left'), strokeColor: 'rgba(3,10,16,0.9)', strokeWidth: 3 },
    );
    for (let i = 0; i < 5; i += 1) {
      const p = (Date.now() / 520 + i * 0.19) % 1;
      const bx = x + OXYGEN_TANK_W + 8 + i * 6;
      const by = y + 122 - p * 72;
      renderer.drawEllipseAlpha('#b8f7ff', (1 - p) * damageP * 0.72, bx, by, 4 + i % 2, 4 + i % 2);
    }
  }
}

export function drawHud(renderer: GameRenderer, state: RenderState): void {
  const W = CANVAS_WIDTH;

  const ms = `${state.hudMoneyDisplay}`;
  const { mW, mX, mY, pillH, iconSize, iconCx, iconCy, textX, textW } = getHudMoneyLayout(ms);
  const pillR = Math.min(20, Math.floor(pillH / 2));
  renderer.drawRoundRectAlpha(C.bg, 0.90, mX, mY, mW, pillH, pillR);
  renderer.drawEllipse(C.gold, iconCx, iconCy, 12, 12);
  renderer.drawEllipse('#7A4010', iconCx, iconCy, 6, 6);
  renderer.drawImage(
    { id: AssetIds.iconCoin },
    iconCx - iconSize / 2,
    mY + (pillH - iconSize) / 2,
    iconSize,
    iconSize,
  );
  renderer.drawText(ms, textX, mY, textW, pillH, {
    ...tb(26, C.gold, 'left'),
    useLayoutMaxWidth: false,
  });

  const btns: Array<{ id: 'bait' | 'net'; cx: number; stock: number }> = [
    { id: 'bait', cx: HUD_BAIT_BUTTON_CX, stock: state.consumables.bait },
    { id: 'net', cx: HUD_NET_BUTTON_CX, stock: state.consumables.net },
  ];
  const ftueConsumableTarget = getFtueConsumableTarget(state.ftuePrompt);
  const hideConsumablesBeforeFtue = state.ftueStage === 'secondDiveConsumables' && ftueConsumableTarget == null;
  for (const btn of btns) {
    if (hideConsumablesBeforeFtue) continue;
    if (ftueConsumableTarget !== null && btn.id !== ftueConsumableTarget) continue;
    if (btn.stock <= 0) continue;
    const flash = btn.id === 'net' ? state.hudConsumableFlash.net : state.hudConsumableFlash.bait;
    const flashPulse = flash > 0 ? flash / 0.34 : 0;
    const btnPulse = btn.id === 'bait' && state.baitActive ? 0.5 + 0.5 * Math.sin(Date.now() / 220) : 0;
    const isFtueConsumable = ftueConsumableTarget === btn.id || state.ftuePrompt === 'useConsumables';
    const ftuePulse = isFtueConsumable ? 0.5 + 0.5 * Math.sin(Date.now() / 180) : 0;
    const ringBoost = 10 + flashPulse * 22;
    const alphaBoost = flashPulse * 0.35;
    const zoom = ftueConsumableTarget === btn.id ? state.ftueConsumableZoom : 1;
    renderer.pushScale(zoom, zoom, btn.cx, HUD_CONSUMABLE_BUTTON_Y);
    renderer.drawEllipseAlpha(
      C.amber,
      0.15 + btnPulse * 0.30 + alphaBoost + ftuePulse * 0.22,
      btn.cx,
      HUD_CONSUMABLE_BUTTON_Y,
      HUD_CONSUMABLE_BUTTON_RADIUS + ringBoost * 0.45 + ftuePulse * 12,
      HUD_CONSUMABLE_BUTTON_RADIUS + ringBoost * 0.45 + ftuePulse * 12,
    );
    renderer.drawEllipseAlpha(C.bg, 0.94, btn.cx, HUD_CONSUMABLE_BUTTON_Y, HUD_CONSUMABLE_BUTTON_RADIUS, HUD_CONSUMABLE_BUTTON_RADIUS);
    renderer.drawEllipseAlpha(
      C.amber,
      0.40 + flashPulse * 0.25,
      btn.cx,
      HUD_CONSUMABLE_BUTTON_Y,
      HUD_CONSUMABLE_BUTTON_RADIUS,
      HUD_CONSUMABLE_BUTTON_RADIUS,
    );
    const isz = (HUD_CONSUMABLE_BUTTON_RADIUS - 7) * 2 * (1 + flashPulse * 0.08);
    renderer.drawImage({ id: CONSUMABLE_ICON_IDS[btn.id] }, btn.cx - isz / 2, HUD_CONSUMABLE_BUTTON_Y - isz / 2, isz, isz);
    renderer.drawEllipse(C.amber, btn.cx + HUD_CONSUMABLE_BUTTON_RADIUS - 7, HUD_CONSUMABLE_BUTTON_Y - HUD_CONSUMABLE_BUTTON_RADIUS + 7, 10, 10);
    renderer.drawText(
      `${btn.stock}`,
      btn.cx + HUD_CONSUMABLE_BUTTON_RADIUS - 18,
      HUD_CONSUMABLE_BUTTON_Y - HUD_CONSUMABLE_BUTTON_RADIUS + 1,
      22,
      14,
      t(11, C.bg, 'center', '800'),
    );
    renderer.pop();
  }
  if (ftueConsumableTarget !== null) drawFtueConsumableHand(renderer, ftueConsumableTarget);

  const hudCenterX = W * 0.5;
  const stackGap = 8;
  const lowTimeTop = mY + pillH + 6;
  const statusTop = lowTimeTop + 36 + stackGap;
  const comboTop = statusTop + 64 + stackGap;
  const debugComboCount = 5;
  const displayComboCount = state.comboActive ? state.comboCount : debugComboCount;
  const comboFontSize = displayComboCount >= 10 ? 88 : displayComboCount >= 5 ? 68 : 52;
  const comboH = comboFontSize + 16;
  const timeBonusFontSize = 42;
  const timeBonusH = timeBonusFontSize + 16;
  const timeBonusTop = comboTop + comboH + stackGap;

  if (state.comboActive || DEBUG_SHOW_GAMEPLAY_MESSAGES) {
    const combo = displayComboCount;
    const pulse = Math.sin(Date.now() / 200);
    const alpha = ((state.comboActive ? 0.82 : 0.48) + 0.18 * pulse).toFixed(2);
    const color = `rgba(0,212,168,${alpha})`;
    const fontSize = comboFontSize;
    const boxW = combo >= 10 ? 360 : combo >= 5 ? 310 : 270;
    const cx = hudCenterX;
    const cy = comboTop + comboH / 2;

    if (combo >= 5) renderer.drawEllipseAlpha(color, 0.07 + 0.05 * pulse, cx, cy, boxW * 0.55, fontSize * 0.9);
    if (combo >= 10) renderer.drawEllipseAlpha(color, 0.10 + 0.06 * pulse, cx, cy, boxW * 0.72, fontSize * 1.3);

    renderer.drawText(`x${combo} COMBO`, cx - boxW / 2, cy - fontSize / 2 - 8, boxW, fontSize + 16, td(fontSize, color, 'center'));
  }

  if (state.oxyBoostActive || DEBUG_SHOW_GAMEPLAY_MESSAGES) {
    const p = Math.sin(Date.now() / 190);
    const alpha = ((state.oxyBoostActive ? 0.85 : 0.46) + 0.15 * p).toFixed(2);
    const glow = `rgba(80,220,255,${alpha})`;
    const cx = hudCenterX;
    const cy = timeBonusTop + timeBonusH / 2;
    renderer.drawText(`+${PUFFER_TIME_BONUS}s O2`, cx - 190, cy - timeBonusH / 2, 380, timeBonusH, td(timeBonusFontSize, glow, 'center'));
  }

  if (
    state.harpoonStatus === 'LOAD'
    || state.harpoonStatus === 'REEL'
    || state.harpoonStatus === 'HAUL'
    || DEBUG_SHOW_GAMEPLAY_MESSAGES
  ) {
    const p = Math.sin(Date.now() / 180);
    const isLoad = state.harpoonStatus === 'LOAD';
    const isReel = state.harpoonStatus === 'REEL';
    const isHaul = state.harpoonStatus === 'HAUL';
    const label = isLoad ? 'RELOADING' : isReel ? 'REELING' : isHaul ? 'HAULING' : 'RELOADING';
    const alpha = ((isLoad || isReel || isHaul ? 0.76 : 0.42) + 0.18 * p).toFixed(2);
    const color = isLoad || isReel
      ? `rgba(112,192,232,${alpha})`
      : `rgba(255,208,64,${alpha})`;
    const cx = hudCenterX;
    const cy = statusTop + 32;
    renderer.drawEllipseAlpha(color, 0.06 + 0.04 * p, cx, cy, 180, 48);
    renderer.drawText(label, cx - 180, cy - 32, 360, 64, td(52, color, 'center'));
  }

  if ((state.timeLeftFraction < 0.30 || DEBUG_SHOW_GAMEPLAY_MESSAGES) && state.ftuePrompt !== 'oxygenLimit') {
    const urgency = state.timeLeftFraction < 0.12 ? 1 : 0;
    const blink = urgency ? (Math.floor(Date.now() / 200) % 2 === 0 ? 1.0 : 0.0) : (0.7 + 0.3 * Math.sin(Date.now() / 280));
    const label = urgency ? 'OUT OF AIR' : 'LOW O2';
    const debugDim = state.timeLeftFraction < 0.30 ? 1 : 0.58;
    const fontSize = urgency ? 52 : 42;
    const warningW = urgency ? 390 : 300;
    const warningH = fontSize + 18;
    const warningX = hudCenterX - warningW / 2;
    const warningCenterY = timeBonusTop + timeBonusH + stackGap + warningH / 2;
    const warningY = warningCenterY - warningH / 2;
    const color = urgency ? '255,68,68' : '255,176,48';
    renderer.drawEllipseAlpha(`rgba(${color},${((0.07 + blink * 0.07) * debugDim).toFixed(2)})`, 1, hudCenterX, warningCenterY, warningW * 0.55, warningH * 0.72);
    renderer.drawText(
      label,
      warningX,
      warningY,
      warningW,
      warningH,
      { ...td(fontSize, `rgba(${color},${(blink * debugDim).toFixed(2)})`, 'center'), strokeColor: 'rgba(3,10,16,0.92)', strokeWidth: 5 },
    );
  }

  drawOxygenTank(renderer, state);
}
