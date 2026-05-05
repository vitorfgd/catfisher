import type { GameRenderer } from './GameRenderer';
import type { RenderFishState, RenderSpearState, RenderState } from './RenderState';
import { FishType, GamePhase } from '../core/Types';
import {
  BAIT_LURE_ICON_PX,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TREASURE_MONEY_LERP_SEC,
} from '../core/Constants';
import { getTurretMuzzleWorld } from '../core/SpearSystem';
import { AssetIds } from '../shared/AssetIds';
import { drawBoatScreen } from './boatScreen';
import { drawHud, getHudMoneyLayout } from './hud';
import { C, t, td, tb } from './theme';
import { actionViewFocus, getActionViewZoomForSession } from '../core/ActionViewTransform';

/** 2D art aspect (width/height) for the center-screen reveal */
const TREASURE_CINEMATIC_ASPECT: Record<'closed' | 'open', number> = {
  closed: 1.15,
  open: 1.1,
};

const FISH_IMAGE_IDS: Record<FishType, string> = {
  [FishType.Small]: AssetIds.fishSmall,
  [FishType.Medium]: AssetIds.fishMedium,
  [FishType.Large]: AssetIds.fishLarge,
  [FishType.Rare]: AssetIds.fishRare,
  [FishType.Jelly]: AssetIds.fishJelly,
  [FishType.Puffer]: AssetIds.fishPuffer,
  [FishType.Treasure]: AssetIds.fishTreasure,
  [FishType.Boss]: AssetIds.fishBoss,
  [FishType.Clown]: AssetIds.fishClown,
};

const FISH_ATTACK_IMAGE_IDS: Partial<Record<FishType, string>> = {
  [FishType.Large]: AssetIds.fishLargeAttack,
};

const FISH_DRAW_WIDTH: Record<FishType, number> = {
  [FishType.Small]: 78,
  [FishType.Medium]: 104,
  [FishType.Large]: 132,
  [FishType.Rare]: 112,
  [FishType.Jelly]: 86,
  [FishType.Puffer]: 72,
  [FishType.Treasure]: 88,
  [FishType.Boss]: 200,
  [FishType.Clown]: 96,
};

const FISH_ASPECT_RATIO: Record<FishType, number> = {
  [FishType.Small]: 350 / 250,
  [FishType.Medium]: 614 / 406,
  [FishType.Large]: 366 / 202,
  [FishType.Rare]: 653 / 382,
  [FishType.Jelly]: 0.85,
  [FishType.Puffer]: 1.0,
  [FishType.Treasure]: 1.2,
  [FishType.Boss]: 1.0,
  [FishType.Clown]: 1.45,
};

function drawBackground(renderer: GameRenderer): void {
  renderer.drawImage({ id: AssetIds.underwaterBg }, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawFishSprite(
  renderer: GameRenderer,
  x: number,
  y: number,
  type: FishType,
  facingLeft: boolean,
  hitFlash: number,
  rotation = 0,
  isAggressive = false,
  scale = 1,
  attackProgress = 0,
): void {
  const attackRefId = isAggressive ? FISH_ATTACK_IMAGE_IDS[type] : undefined;
  const attackGrow = attackRefId != null ? attackProgress * attackProgress : 0;
  const attackScale = attackRefId != null ? 1 + attackGrow * 1.25 : 1;
  const w = FISH_DRAW_WIDTH[type] * scale * attackScale;
  const h = w / (attackRefId != null ? 1 : FISH_ASPECT_RATIO[type]);
  const ref = { id: attackRefId ?? FISH_IMAGE_IDS[type] };
  const now = Date.now();

  if (type === FishType.Puffer) {
    const oxPulse = 0.60 + 0.40 * Math.sin(now / 220);
    renderer.drawText(
      '+TIME',
      x - 44,
      y - h / 2 - 20,
      88,
      18,
      { ...tb(13, `rgba(80,220,255,${(0.75 + oxPulse * 0.25).toFixed(2)})`, 'center'), strokeColor: 'rgba(3,10,16,0.85)', strokeWidth: 3 },
    );
  }

  if (type === FishType.Boss) {
    const pulse = 0.55 + 0.45 * Math.sin(now / 160);
    const a = (0.5 + pulse * 0.5).toFixed(2);
    renderer.drawText(
      'ROCKFISH',
      x - 120,
      y - h / 2 - 32,
      240,
      22,
      { ...tb(18, `rgba(255,60,50,${a})`, 'center'), strokeColor: 'rgba(3,10,16,0.9)', strokeWidth: 3 },
    );
  }

  if (type === FishType.Treasure) {
    const glint = 0.35 + 0.2 * Math.sin(now / 280);
    renderer.drawEllipseAlpha('rgba(255,220,120,0.35)', glint, x, y, w * 0.6, h * 0.45);
  }

  if (isAggressive) {
    const aggroPulse = 0.55 + 0.45 * Math.sin(now / 180);
    const alpha = (0.75 + aggroPulse * 0.25).toFixed(2);
    renderer.drawText(
      'DANGER',
      x - 82,
      y - h / 2 - 40,
      164,
      38,
      {
        ...tb(30, `rgba(255,60,30,${alpha})`, 'center'),
        strokeColor: 'rgba(3,10,16,0.92)',
        strokeWidth: 5,
        shadowColor: 'rgba(255,60,30,0.34)',
        shadowBlur: 12,
      },
    );
  }

  renderer.pushTranslate(x, y);
  if (attackRefId == null && Math.abs(rotation) > 0.008) renderer.pushRotate((rotation * 180) / Math.PI, 0, 0);
  if (attackRefId == null && facingLeft && type !== FishType.Jelly) renderer.pushScale(-1, 1, 0, 0);

  renderer.drawImage(ref, -w / 2, -h / 2, w, h);
  if (hitFlash > 0.05) {
    if (type === FishType.Boss) {
      const a = hitFlash * 0.35;
      renderer.drawEllipseAlpha('#fff6f0', a, 0, 0, w * 0.36, h * 0.2);
    } else if (type === FishType.Large) {
      // Ellipse on the body only — full rect also whites out transparent sprite padding
      const a = hitFlash * 0.4;
      renderer.drawEllipseAlpha('#fff6f0', a, 0, 0, w * 0.42, h * 0.32);
    } else {
      renderer.drawRectAlpha('#ffffff', hitFlash * 0.5, -w / 2, -h / 2, w, h);
    }
  }

  if (attackRefId == null && facingLeft && type !== FishType.Jelly) renderer.pop();
  if (attackRefId == null && Math.abs(rotation) > 0.008) renderer.pop();
  renderer.pop();
}

function drawFish(renderer: GameRenderer, fish: RenderFishState): void {
  drawFishSprite(
    renderer,
    fish.x,
    fish.y,
    fish.type,
    fish.facingLeft,
    fish.hitFlash,
    fish.rotation,
    fish.isAggressive,
    fish.drawScale ?? 1,
    fish.attackProgress,
  );
}

function drawTether(renderer: GameRenderer, fx: number, fy: number, tx2: number, ty2: number): void {
  const len = Math.hypot(tx2 - fx, ty2 - fy);
  const ang = Math.atan2(ty2 - fy, tx2 - fx);
  renderer.pushTranslate(fx, fy);
  renderer.pushRotate((ang * 180) / Math.PI, 0, 0);
  renderer.drawRectAlpha('#e8f7ff', 0.90, 0, -1.4, len, 2.8);
  renderer.drawRectAlpha('#86d9ff', 0.20, 0, -3, len, 6);
  renderer.pop();
  renderer.pop();
}

function drawSpear(
  renderer: GameRenderer,
  playerX: number,
  playerY: number,
  spear: RenderSpearState,
): void {
  const muzzle = getTurretMuzzleWorld(playerX, playerY);
  drawTether(renderer, muzzle.x, muzzle.y, spear.x, spear.y);
  if (spear.carryingFishType !== null) {
    const off = 28;
    drawFishSprite(
      renderer,
      spear.x - Math.cos(spear.angle) * off,
      spear.y - Math.sin(spear.angle) * off,
      spear.carryingFishType,
      Math.cos(spear.angle) >= 0,
      0,
      0,
      false,
      spear.carryingFishScale,
    );
  }
  renderer.pushTranslate(spear.x, spear.y);
  renderer.pushRotate((spear.angle * 180) / Math.PI, 0, 0);
  renderer.drawRect('#d9c57e', -2, -2.2, 30, 4.4);
  renderer.drawRect('#53636f', -4, -4, 8, 8);
  renderer.drawPolygon('#f7e56c', [28, -4, 40, 0, 28, 4]);
  renderer.pop();
  renderer.pop();
}

function drawParticles(renderer: GameRenderer, particles: RenderState['particles']): void {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    if (p.streak) {
      const ang = (Math.atan2(p.vy, p.vx) * 180) / Math.PI;
      renderer.pushTranslate(p.x, p.y);
      renderer.pushRotate(ang, 0, 0);
      renderer.drawEllipseAlpha(
        p.color,
        a * 0.92,
        0,
        0,
        p.radius * 2.4,
        Math.max(0.4, p.radius * 0.45),
      );
      renderer.pop();
      renderer.pop();
    } else {
      renderer.drawEllipseAlpha(p.color, a, p.x, p.y, p.radius, p.radius);
    }
  }
}

/**
 * Pixel-art hand points **right** — we anchor the **fingertip** on the first fish
 * (tap target) so it reads as a click on the fish, not a floating icon.
 * Tip in asset ≈ 88% from the left, 50% from the top of the draw square.
 */
const FTUE_HAND_PX = 60;
const FTUE_HAND_TIP_X_FR = 0.88;
const FTUE_HAND_TIP_Y_FR = 0.5;
/** Extra X offset; negative nudges the tap point left. */
const FTUE_HAND_BASE_NUDGE_X = -15;
/** Extra offset so the hand sits slightly lower on the target (screen Y+). */
const FTUE_HAND_BASE_NUDGE_Y = -10;
/** Asymmetric 0..1: fast “strike”, slower release = tap, not a circular wobble. */
const FTUE_CLICK_MS = 380;
function ftueClickPressT(): number {
  const u = (Date.now() % FTUE_CLICK_MS) / FTUE_CLICK_MS;
  if (u < 0.16) return u / 0.16; // down — quick
  return 1 - (u - 0.16) / 0.84; // up — a bit longer
}
const FTUE_CLICK_DIP_PX = 9;

function drawFtueHandWorld(renderer: GameRenderer, state: RenderState): void {
  const target = state.fish[0];
  if (target == null) return;
  const s = target.drawScale ?? 1;
  const fishW = FISH_DRAW_WIDTH[target.type] * s;
  const fishH = fishW / FISH_ASPECT_RATIO[target.type];
  // Tap point on fish; Y-only motion reads as a click (no sin X/Y loop).
  const press = ftueClickPressT();
  const tipX = target.x - fishW * 0.1 + FTUE_HAND_BASE_NUDGE_X;
  const tipY = target.y - fishH * 0.08 + FTUE_HAND_BASE_NUDGE_Y + press * FTUE_CLICK_DIP_PX;

  const hw = FTUE_HAND_PX;
  const hh = FTUE_HAND_PX;
  const drawL = tipX - FTUE_HAND_TIP_X_FR * hw;
  const drawT = tipY - FTUE_HAND_TIP_Y_FR * hh;
  // 30° clockwise (canvas: positive = clockwise) around the fingertip
  renderer.pushRotate(30, tipX, tipY);
  renderer.drawImage({ id: AssetIds.ftueHand }, drawL, drawT, hw, hh);
  renderer.pop();
}

/**
 * FTUE: primary copy anchored to the **bottom** of the screen (reels / thumb zone).
 * Soft fade from transparent so it doesn’t read as a top bar.
 */
function drawFtueCtaOnly(renderer: GameRenderer): void {
  const H = CANVAS_HEIGHT;
  const W = CANVAS_WIDTH;
  const bottomPad = 24;
  const subH = 40;
  const subY = H - bottomPad - subH;
  const headH = 56;
  const headGap = 8;
  const headY = subY - headGap - headH;
  const bandH = 200;
  renderer.drawGradientRect('rgba(1,3,6,0)', 'rgba(1,3,6,0.52)', 0, H - bandH, W, bandH);
  renderer.drawText('CATCH FISH · CASH IN', 0, headY, W, headH, td(42, C.white, 'center'));
  renderer.drawText('One tap, full run. Get paid on every catch.', 0, subY, W, subH, t(15, C.teal, 'center', '800'));
}

/**
 * Chest opens at spear hit (screen-projected); light vignette, copy tucked near the prop.
 */
function drawTreasureCinematicOverlay(renderer: GameRenderer, state: RenderState): void {
  const c = state.treasureCinematic;
  if (c == null) return;

  const w = Math.min(1, Math.max(0, c.revealWhiteAlpha));
  const showCinematicBody = w < 0.999;

  const chestCx = c.chestScreenX;
  const chestCy = c.chestScreenY;
  const tSec = Date.now() / 1000;
  const sh = c.shake;
  const shakeX = Math.sin(tSec * 50) * sh * 5;
  const shakeY = Math.cos(tSec * 40) * sh * 4;
  const chestState = c.opened ? 'open' : 'closed';
  const ar = TREASURE_CINEMATIC_ASPECT[chestState];
  const baseH = CANVAS_HEIGHT * 0.22 * c.chestScale;
  const baseW = baseH * ar;
  const drawL = chestCx - baseW / 2 + shakeX;
  const drawT = chestCy - baseH * 0.5 + shakeY;

  if (showCinematicBody) {
    renderer.drawRectAlpha('rgba(4, 12, 22, 0.2)', 1, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const id = c.opened ? AssetIds.treasureChestOpen : AssetIds.fishTreasure;
    renderer.drawImage({ id }, drawL, drawT, baseW, baseH);

    const labelY = drawT - 28;
    renderer.drawText('TREASURE', chestCx - 120, labelY, 240, 26, td(22, '#ffe8a0', 'center'));
    if (c.comboText != null) {
      renderer.drawText(
        c.comboText,
        chestCx - 100,
        drawT + baseH * 0.72,
        200,
        24,
        t(16, C.haul, 'center', '800'),
      );
    }
    renderer.drawText(c.prizeText, chestCx - 100, drawT + baseH * 0.88, 200, 36, td(26, C.gold, 'center'));
  }

  if (w > 0) {
    renderer.drawRectAlpha('#ffffff', w, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function drawTreasureFlyingCoins(renderer: GameRenderer, state: RenderState): void {
  const c = state.treasureCinematic;
  if (c == null || c.elapsedSinceAward <= 0) return;

  const layout = getHudMoneyLayout(`${state.hudMoneyDisplay}`);
  const tx = layout.iconCx;
  const ty = layout.iconCy;
  const fromX = c.chestScreenX;
  const fromY = c.chestScreenY - 8;
  const flight = TREASURE_MONEY_LERP_SEC + 0.12;
  const spread = 0.2 / Math.max(1, c.coinCount - 1);

  for (let i = 0; i < c.coinCount; i += 1) {
    const stagger = i * spread;
    let u = (c.elapsedSinceAward - stagger) / flight;
    if (u <= 0) continue;
    if (u > 1) u = 1;
    const ease = 1 - (1 - u) * (1 - u);
    const arc = Math.sin(Math.PI * ease) * 72;
    const x = fromX + (tx - fromX) * ease;
    const y = fromY + (ty - fromY) * ease - arc;
    let a = 1;
    if (u < 0.1) a = u / 0.1;
    else if (u > 0.88) a = (1 - u) / 0.12;
    const sz = 20 * (0.82 + 0.18 * ease);
    renderer.drawImageAlpha({ id: AssetIds.iconCoin }, x - sz / 2, y - sz / 2, sz, sz, Math.min(1, Math.max(0, a)));
  }
}

function drawFloatingTexts(renderer: GameRenderer, texts: RenderState['floatingTexts']): void {
  for (const txt of texts) {
    const a = txt.life / txt.maxLife;
    const isCombo = txt.text.includes('COMBO');
    const sc = (txt.textScale ?? 1) * (0.9 + 0.1 * a);
    const basePx = isCombo ? 20 : 26;
    const fs = Math.round(basePx * (isCombo ? 1.05 : sc) * (isCombo ? 1.12 : 1));
    const tier = txt.tier ?? 'normal';
    let fill: string;
    if (isCombo) {
      fill = `rgba(0,212,168,${a.toFixed(2)})`;
    } else if (tier === 'jackpot') {
      fill = `rgba(255,248,150,${a.toFixed(2)})`;
    } else if (tier === 'good') {
      fill = `rgba(255,220,100,${a.toFixed(2)})`;
    } else {
      fill = `rgba(255,208,64,${a.toFixed(2)})`;
    }
    const sw = isCombo || tier === 'jackpot' ? 3.5 : 2.5;
    renderer.drawText(
      txt.text,
      txt.x - 80,
      txt.y - 20,
      160,
      40,
      {
        ...tb(fs, fill, 'center'),
        strokeColor: `rgba(3,10,16,${(a * 0.92).toFixed(2)})`,
        strokeWidth: sw,
        shadowColor: tier === 'jackpot' || isCombo ? 'rgba(0,0,0,0.4)' : undefined,
        shadowBlur: tier === 'jackpot' || isCombo ? 10 : 0,
      },
    );
  }
}

export function renderFrame(renderer: GameRenderer, state: RenderState): void {
  renderer.clear();

  if (state.phase === GamePhase.Boat) {
    drawBoatScreen(renderer, state);
    return;
  }

  const isFtue = state.phase === GamePhase.Action && state.ftueActive;
  const actionZoomed = state.phase === GamePhase.Action;
  const zf = actionZoomed ? actionViewFocus(state.player.x, state.player.y) : null;
  const z = getActionViewZoomForSession(state.actionSessionTime, state.ftueActive);

  renderer.pushTranslate(state.shakeX, state.shakeY);
  if (actionZoomed && zf) {
    renderer.pushScale(z, z, zf.x, zf.y);
  }

  drawBackground(renderer);

  if (state.baitActive) {
    const s = BAIT_LURE_ICON_PX;
    const half = s / 2;
    const bp = 0.5 + 0.5 * Math.sin(Date.now() / 220);
    const expiring = state.baitFraction < 0.25;
    const flick = expiring ? 0.35 + 0.65 * Math.abs(Math.sin(Date.now() / 55)) : 1;
    // Soft water glow under the same asset as the boat + HUD
    renderer.drawEllipseAlpha(C.amber, (0.11 + bp * 0.1) * flick, state.baitX, state.baitY, s * 0.9, s * 0.72);
    const rings = Math.ceil(state.baitFraction * 4);
    for (let i = 0; i < rings; i += 1) {
      renderer.drawEllipseAlpha(C.amber, (0.14 + bp * 0.08) * flick, state.baitX, state.baitY, half * 0.6 + i * 7, half * 0.45 + i * 5);
    }
    renderer.drawImageAlpha(
      { id: AssetIds.iconBait },
      state.baitX - half,
      state.baitY - half,
      s,
      s,
      expiring ? Math.min(1, 0.45 + 0.55 * flick) : 1,
    );
  }

  // Rock boss can cover small fish: draw it first, then the rest, so the player can see targets
  for (const fish of state.fish) {
    if (fish.type === FishType.Boss) drawFish(renderer, fish);
  }
  for (const fish of state.fish) {
    if (fish.type !== FishType.Boss) drawFish(renderer, fish);
  }
  if (isFtue) {
    drawFtueHandWorld(renderer, state);
  }
  for (const spear of state.spears) drawSpear(renderer, state.player.x, state.player.y, spear);
  drawParticles(renderer, state.particles);
  drawFloatingTexts(renderer, state.floatingTexts);
  if (actionZoomed) {
    renderer.pop();
  }
  renderer.pop();

  if (state.phase === GamePhase.Action && state.catchFlash > 0) {
    const f = state.catchFlash;
    renderer.drawRectAlpha('#fff4e0', f * 0.38, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.drawRectAlpha('#8cf0ff', f * 0.06, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  if (state.phase === GamePhase.Action && !state.ftueActive) {
    drawHud(renderer, state);
  }
  if (state.phase === GamePhase.Action && state.ftueActive) {
    drawFtueCtaOnly(renderer);
  }
  if (state.phase === GamePhase.Action && state.sharkBiteFlash > 0) {
    const f = state.sharkBiteFlash;
    renderer.drawRectAlpha('#ff1717', f * 0.34, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.drawRectAlpha('#2a0000', f * 0.14, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  if (state.treasureCinematic != null) {
    drawTreasureCinematicOverlay(renderer, state);
    drawTreasureFlyingCoins(renderer, state);
  }
  if (state.phase === GamePhase.Diving && state.diveAlpha < 1) {
    renderer.drawRectAlpha(C.bg, 1 - state.diveAlpha, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}
