import {
  CANVAS_WIDTH,
  HUD_TIME_STRIP_HEIGHT,
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

const OXYGEN_STRIP_Y = 0;
const MONEY_UNDER_OXYGEN_GAP = 8;

export function getHudMoneyLayout(moneyDigits: string): {
  mW: number;
  mX: number;
  mY: number;
  pillH: number;
  iconCx: number;
  iconCy: number;
  iconSize: number;
} {
  const mW = Math.max(110, moneyDigits.length * 16 + 56);
  const mX = 12;
  const pillH = 52;
  const mY = OXYGEN_STRIP_Y + HUD_TIME_STRIP_HEIGHT + MONEY_UNDER_OXYGEN_GAP;
  const iconSize = 26;
  const iconCx = mX + 9 + iconSize / 2;
  const iconCy = mY + (pillH - iconSize) / 2 + iconSize / 2;
  return { mW, mX, mY, pillH, iconCx, iconCy, iconSize };
}

export function drawHud(renderer: GameRenderer, state: RenderState): void {
  const W = CANVAS_WIDTH;

  const ms = `${state.hudMoneyDisplay}`;
  const { mW, mX, mY, pillH, iconSize } = getHudMoneyLayout(ms);
  renderer.drawRoundRectAlpha(C.bg, 0.90, mX, mY, mW, pillH, 26);
  renderer.drawEllipse(C.gold, mX + 22, mY + pillH / 2, 12, 12);
  renderer.drawEllipse('#7A4010', mX + 22, mY + pillH / 2, 6, 6);
  renderer.drawImage({ id: AssetIds.iconCoin }, mX + 9, mY + (pillH - iconSize) / 2, iconSize, iconSize);
  renderer.drawText(ms, mX + 40, mY, mW - 48, pillH, tb(26, C.gold, 'left'));

  const btns: Array<{ id: 'bait' | 'net'; cx: number; stock: number }> = [
    { id: 'bait', cx: HUD_BAIT_BUTTON_CX, stock: state.consumables.bait },
    { id: 'net', cx: HUD_NET_BUTTON_CX, stock: state.consumables.net },
  ];
  for (const btn of btns) {
    if (btn.stock <= 0) continue;
    const flash = btn.id === 'net' ? state.hudConsumableFlash.net : state.hudConsumableFlash.bait;
    const flashPulse = flash > 0 ? flash / 0.34 : 0;
    const btnPulse = btn.id === 'bait' && state.baitActive ? 0.5 + 0.5 * Math.sin(Date.now() / 220) : 0;
    const ringBoost = 10 + flashPulse * 22;
    const alphaBoost = flashPulse * 0.35;
    renderer.drawEllipseAlpha(
      C.amber,
      0.15 + btnPulse * 0.30 + alphaBoost,
      btn.cx,
      HUD_CONSUMABLE_BUTTON_Y,
      HUD_CONSUMABLE_BUTTON_RADIUS + ringBoost * 0.45,
      HUD_CONSUMABLE_BUTTON_RADIUS + ringBoost * 0.45,
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
  }

  const hudCenterX = W * 0.5;
  const stackGap = 8;
  const lowTimeTop = mY + pillH + 6;
  const statusTop = lowTimeTop + 36 + stackGap;
  const comboTop = statusTop + 64 + stackGap;
  const comboFontSize = state.comboCount >= 10 ? 88 : state.comboCount >= 5 ? 68 : 52;
  const comboH = comboFontSize + 16;
  const timeBonusFontSize = 42;
  const timeBonusH = timeBonusFontSize + 16;
  const timeBonusTop = comboTop + comboH + stackGap;

  if (state.comboActive) {
    const combo = state.comboCount;
    const pulse = Math.sin(Date.now() / 200);
    const alpha = (0.82 + 0.18 * pulse).toFixed(2);
    const color = `rgba(0,212,168,${alpha})`;
    const fontSize = comboFontSize;
    const boxW = combo >= 10 ? 360 : combo >= 5 ? 310 : 270;
    const cx = hudCenterX;
    const cy = comboTop + comboH / 2;

    if (combo >= 5) renderer.drawEllipseAlpha(color, 0.07 + 0.05 * pulse, cx, cy, boxW * 0.55, fontSize * 0.9);
    if (combo >= 10) renderer.drawEllipseAlpha(color, 0.10 + 0.06 * pulse, cx, cy, boxW * 0.72, fontSize * 1.3);

    renderer.drawText(`x${combo} COMBO`, cx - boxW / 2, cy - fontSize / 2 - 8, boxW, fontSize + 16, td(fontSize, color, 'center'));
  }

  if (state.oxyBoostActive) {
    const p = Math.sin(Date.now() / 190);
    const alpha = (0.85 + 0.15 * p).toFixed(2);
    const glow = `rgba(80,220,255,${alpha})`;
    const cx = hudCenterX;
    const cy = timeBonusTop + timeBonusH / 2;
    renderer.drawText(`+${PUFFER_TIME_BONUS}s TIME`, cx - 190, cy - timeBonusH / 2, 380, timeBonusH, td(timeBonusFontSize, glow, 'center'));
  }

  if (state.harpoonStatus === 'LOAD' || state.harpoonStatus === 'REEL' || state.harpoonStatus === 'HAUL') {
    const p = Math.sin(Date.now() / 180);
    const isLoad = state.harpoonStatus === 'LOAD';
    const isReel = state.harpoonStatus === 'REEL';
    const label = isLoad ? 'RELOADING' : isReel ? 'REELING' : 'HAULING';
    const alpha = (0.76 + 0.18 * p).toFixed(2);
    const color = isLoad || isReel
      ? `rgba(112,192,232,${alpha})`
      : `rgba(255,208,64,${alpha})`;
    const cx = hudCenterX;
    const cy = statusTop + 32;
    renderer.drawEllipseAlpha(color, 0.06 + 0.04 * p, cx, cy, 180, 48);
    renderer.drawText(label, cx - 180, cy - 32, 360, 64, td(52, color, 'center'));
  }

  const STRIP_Y = OXYGEN_STRIP_Y;
  if (state.timeLeftFraction < 0.30) {
    const urgency = state.timeLeftFraction < 0.12 ? 1 : 0;
    const blink = urgency ? (Math.floor(Date.now() / 200) % 2 === 0 ? 1.0 : 0.0) : (0.7 + 0.3 * Math.sin(Date.now() / 280));
    const label = urgency ? '⚠ OUT OF TIME' : 'LOW TIME';
    renderer.drawText(
      label,
      0,
      lowTimeTop,
      W,
      36,
      { ...tb(urgency ? 22 : 18, `rgba(${urgency ? '255,68,68' : '255,176,48'},${blink.toFixed(2)})`, 'center'), strokeColor: 'rgba(3,10,16,0.9)', strokeWidth: 3 },
    );
  }

  const STRIP_H = HUD_TIME_STRIP_HEIGHT;
  renderer.drawRectAlpha(C.bg, 0.92, 0, STRIP_Y, W, STRIP_H);
  renderer.drawRectAlpha(C.teal, 0.30, 0, STRIP_Y, W, 1);

  const oxyBarH = 30;
  const oxyBarY = STRIP_Y + (STRIP_H - oxyBarH) / 2;
  const tFrac = Math.max(0, state.timeLeftFraction);
  const barColor = tFrac > 0.5 ? C.teal : tFrac > 0.25 ? C.warn : C.danger;
  const secLeft = Math.max(0, Math.ceil(state.roundTimeLeft));

  renderer.drawText('TIME', 10, oxyBarY, 50, oxyBarH, t(15, C.muted, 'left'));
  const barX = 58;
  const barW = W - 116;
  renderer.drawRoundRect(C.border, barX - 2, oxyBarY - 2, barW + 4, oxyBarH + 4, 11);
  renderer.drawRoundRect(barColor, barX, oxyBarY, Math.max(10, barW * tFrac), oxyBarH, 10);
  renderer.drawRoundRectAlpha(barColor, 0.22, barX, oxyBarY, Math.max(10, barW * tFrac), oxyBarH, 10);
  renderer.drawText(`${secLeft}s`, W - 52, oxyBarY, 50, oxyBarH, t(16, C.muted, 'right', '600'));
}
