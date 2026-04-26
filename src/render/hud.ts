import { CANVAS_HEIGHT, CANVAS_WIDTH, PUFFER_TIME_BONUS } from '../core/Constants';
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

const PLAYER_SPRITE_H = 164;

const CONSUMABLE_ICON_IDS: Record<'net' | 'bait', string> = {
  net: AssetIds.iconNet,
  bait: AssetIds.iconBait,
};

export function drawHud(renderer: GameRenderer, state: RenderState): void {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  if (state.harpoonStatus === 'LOAD') {
    const rW = 150;
    const rX = (W - rW) / 2;
    const rY = 12;
    renderer.drawRoundRectAlpha(C.bg, 0.90, rX, rY, rW, 46, 23);
    renderer.drawRoundRect(C.border, rX + 10, rY + 8, rW - 20, 14, 7);
    const rbColor = state.reloadFraction > 0.7 ? C.haul : C.reload;
    renderer.drawRoundRect(rbColor, rX + 10, rY + 8, Math.max(6, (rW - 20) * state.reloadFraction), 14, 7);
    renderer.drawText('RELOAD', rX, rY + 28, rW, 14, t(12, C.muted, 'center'));
  } else if (state.harpoonStatus === 'REEL') {
    const pW = 130;
    const pX = (W - pW) / 2;
    renderer.drawRoundRectAlpha(C.bg, 0.88, pX, 12, pW, 38, 19);
    renderer.drawText('↗ REELING', pX, 12, pW, 38, t(15, C.blue, 'center', '700'));
  } else if (state.harpoonStatus === 'HAUL') {
    const pW = 130;
    const pX = (W - pW) / 2;
    renderer.drawRoundRectAlpha(C.bg, 0.88, pX, 12, pW, 38, 19);
    renderer.drawText('↙ HAULING', pX, 12, pW, 38, t(15, C.haul, 'center', '700'));
  }

  const ms = `${state.money}`;
  const mW = Math.max(110, ms.length * 16 + 56);
  const mX = W - mW - 12;
  renderer.drawRoundRectAlpha(C.bg, 0.90, mX, 12, mW, 52, 26);
  renderer.drawEllipse(C.gold, mX + 22, 38, 12, 12);
  renderer.drawEllipse('#7A4010', mX + 22, 38, 6, 6);
  renderer.drawImage({ id: AssetIds.iconCoin }, mX + 9, 25, 26, 26);
  renderer.drawText(ms, mX + 40, 12, mW - 48, 52, tb(26, C.gold, 'left'));

  const elapsed = Math.max(0, state.timeElapsed);
  const w = 108;
  renderer.drawRoundRectAlpha(C.bg, 0.88, 12, 12, w, 46, 23);
  renderer.drawText(`W${state.waveIndex}`, 12, 12, w, 22, t(12, C.muted, 'center', '600'));
  renderer.drawText(`${Math.floor(elapsed)}s`, 12, 24, w, 22, tb(20, C.blue, 'center'));

  const btns: Array<{ id: 'bait' | 'net'; cx: number; stock: number }> = [
    { id: 'bait', cx: HUD_BAIT_BUTTON_CX, stock: state.consumables.bait },
    { id: 'net', cx: HUD_NET_BUTTON_CX, stock: state.consumables.net },
  ];
  for (const btn of btns) {
    if (btn.stock <= 0) continue;
    const btnPulse = btn.id === 'bait' && state.baitActive ? 0.5 + 0.5 * Math.sin(Date.now() / 220) : 0;
    renderer.drawEllipseAlpha(
      C.amber,
      0.15 + btnPulse * 0.30,
      btn.cx,
      HUD_CONSUMABLE_BUTTON_Y,
      HUD_CONSUMABLE_BUTTON_RADIUS + 8,
      HUD_CONSUMABLE_BUTTON_RADIUS + 8,
    );
    renderer.drawEllipseAlpha(C.bg, 0.94, btn.cx, HUD_CONSUMABLE_BUTTON_Y, HUD_CONSUMABLE_BUTTON_RADIUS, HUD_CONSUMABLE_BUTTON_RADIUS);
    renderer.drawEllipseAlpha(
      C.amber,
      0.40,
      btn.cx,
      HUD_CONSUMABLE_BUTTON_Y,
      HUD_CONSUMABLE_BUTTON_RADIUS,
      HUD_CONSUMABLE_BUTTON_RADIUS,
    );
    const isz = (HUD_CONSUMABLE_BUTTON_RADIUS - 7) * 2;
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

  if (state.comboActive) {
    const combo = state.comboCount;
    const pulse = Math.sin(Date.now() / 200);
    const alpha = (0.82 + 0.18 * pulse).toFixed(2);
    const color = `rgba(0,212,168,${alpha})`;
    const fontSize = combo >= 10 ? 54 : combo >= 5 ? 40 : 30;
    const boxW = combo >= 10 ? 260 : combo >= 5 ? 210 : 180;
    const cx = state.player.x;
    const cy = state.player.y - PLAYER_SPRITE_H - 20;

    if (combo >= 5) renderer.drawEllipseAlpha(color, 0.07 + 0.05 * pulse, cx, cy, boxW * 0.55, fontSize * 0.9);
    if (combo >= 10) renderer.drawEllipseAlpha(color, 0.10 + 0.06 * pulse, cx, cy, boxW * 0.72, fontSize * 1.3);

    renderer.drawText(`x${combo} COMBO`, cx - boxW / 2, cy - fontSize / 2 - 6, boxW, fontSize + 12, td(fontSize, color, 'center'));
  }

  if (state.oxyBoostActive) {
    const p = Math.sin(Date.now() / 190);
    const alpha = (0.85 + 0.15 * p).toFixed(2);
    const glow = `rgba(80,220,255,${alpha})`;
    const cx = state.player.x;
    const cy = state.player.y - PLAYER_SPRITE_H - 60;
    renderer.drawEllipseAlpha(glow, 0.08 + 0.06 * p, cx, cy, 140, 36);
    renderer.drawText(`+${PUFFER_TIME_BONUS}s TIME`, cx - 130, cy - 22, 260, 44, td(36, glow, 'center'));
  }

  const STRIP_Y = 804;
  if (state.timeLeftFraction < 0.30) {
    const urgency = state.timeLeftFraction < 0.12 ? 1 : 0;
    const blink = urgency ? (Math.floor(Date.now() / 200) % 2 === 0 ? 1.0 : 0.0) : (0.7 + 0.3 * Math.sin(Date.now() / 280));
    const label = urgency ? '⚠ OUT OF TIME' : 'LOW TIME';
    renderer.drawText(
      label,
      0,
      STRIP_Y - 68,
      W,
      36,
      { ...tb(urgency ? 22 : 18, `rgba(${urgency ? '255,68,68' : '255,176,48'},${blink.toFixed(2)})`, 'center'), strokeColor: 'rgba(3,10,16,0.9)', strokeWidth: 3 },
    );
  }

  const STRIP_H = H - STRIP_Y;
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
