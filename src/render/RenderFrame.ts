import type { GameRenderer } from './GameRenderer';
import type { RenderFishState, RenderSpearState, RenderState } from './RenderState';
import { FishType, GamePhase } from '../core/Types';
import {
  BAIT_LURE_ICON_PX,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NET_VFX_FADE_SEC,
  NET_VFX_SLIDE_GROW_SEC,
  NET_VFX_TOTAL_SEC,
  HARPOON_GUN_ANIM_RISE_SEC,
  HARPOON_GUN_ANIM_TOTAL_SEC,
  HARPOON_GUN_DRAW_W,
  HARPOON_GUN_DRAW_H,
  HARPOON_GUN_SLIDE_HIDDEN_PX,
  SHARK_BITE_VFX_APPROACH_SEC,
  SHARK_BITE_VFX_CLAMP_JITTER_SEC,
  SHARK_BITE_VFX_TOTAL_SEC,
  TREASURE_MONEY_LERP_SEC,
} from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import { drawBoatScreen } from './boatScreen';
import {
  drawDiveBackdropWipe,
  drawDiveMaskedBackdrops,
  drawDiveTransitionFull,
  drawDiveWaterlineVfx,
} from './diveTransition';
import { drawHud, getHudMoneyLayout } from './hud';
import { Boat, C, t, td, tb } from './theme';
import { actionViewFocus, actionWorldToCanvas, getActionViewZoomForSession } from '../core/ActionViewTransform';
import { getHarpoonMuzzleWorldFromGrip } from '../core/SpearSystem';

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

const SHARK_Y_SCALE_MIN = 0.72;
const SHARK_Y_SCALE_MAX = 1.35;

function sharkYPositionScale(y: number): number {
  const t = Math.min(1, Math.max(0, y / CANVAS_HEIGHT));
  const u = t * t * (3 - 2 * t);
  return SHARK_Y_SCALE_MIN + (SHARK_Y_SCALE_MAX - SHARK_Y_SCALE_MIN) * u;
}

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
  const attackGrow = attackRefId != null ? attackProgress * attackProgress * attackProgress : 0;
  const attackScale = attackRefId != null ? 0.86 + attackGrow * 1.36 : 1;
  const yScale = attackRefId != null ? sharkYPositionScale(y) : 1;
  const w = FISH_DRAW_WIDTH[type] * scale * yScale * attackScale;
  const h = w / (attackRefId != null ? 1 : FISH_ASPECT_RATIO[type]);
  const ref = { id: attackRefId ?? FISH_IMAGE_IDS[type] };
  const now = Date.now();

  if (type === FishType.Puffer) {
    const oxPulse = 0.60 + 0.40 * Math.sin(now / 220);
    renderer.drawText(
      '+O2',
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
  const scale = fish.drawScale ?? 1;
  drawFishSprite(
    renderer,
    fish.x,
    fish.y,
    fish.type,
    fish.facingLeft,
    fish.hitFlash,
    fish.rotation,
    fish.isAggressive,
    scale,
    fish.attackProgress,
  );
  if (fish.type === FishType.Large && fish.maxHitPoints != null && fish.hitPoints != null) {
    const attackGrow = fish.isAggressive ? fish.attackProgress * fish.attackProgress * fish.attackProgress : 0;
    const attackScale = fish.isAggressive ? 0.86 + attackGrow * 1.36 : 1;
    const yScale = fish.isAggressive ? sharkYPositionScale(fish.y) : 1;
    const fishW = FISH_DRAW_WIDTH[fish.type] * scale * yScale * attackScale;
    const fishH = fishW / (fish.isAggressive ? 1 : FISH_ASPECT_RATIO[fish.type]);
    const hpW = 86;
    const hpH = 8;
    const hpX = fish.x - hpW / 2;
    const hpY = fish.y + fishH * 0.5 + 14;
    const frac = Math.max(0, Math.min(1, fish.hitPoints / fish.maxHitPoints));
    renderer.drawRoundRectAlpha(C.bg, 0.82, hpX - 3, hpY - 3, hpW + 6, hpH + 6, 7);
    renderer.drawRoundRect(C.danger, hpX, hpY, Math.max(8, hpW * frac), hpH, 4);
    if (fish.isFleeing) {
      renderer.drawText(
        'RETREATING',
        fish.x - 72,
        fish.y - 76,
        144,
        22,
        { ...tb(15, C.warn, 'center'), strokeColor: 'rgba(3,10,16,0.88)', strokeWidth: 3 },
      );
    }
  }
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

function drawSpearTether(
  renderer: GameRenderer,
  tetherMuzzleX: number,
  tetherMuzzleY: number,
  spear: RenderSpearState,
): void {
  drawTether(renderer, tetherMuzzleX, tetherMuzzleY, spear.x, spear.y);
}

function drawSpearBody(renderer: GameRenderer, spear: RenderSpearState): void {
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
  const target = (() => {
    const ftueSpear = state.spears.find((spear) => spear.carryingFtueShowcase && spear.carryingFishType !== null);
    if (ftueSpear != null) {
      return {
        x: ftueSpear.x - Math.cos(ftueSpear.angle) * 28,
        y: ftueSpear.y - Math.sin(ftueSpear.angle) * 28,
        type: ftueSpear.carryingFishType!,
        drawScale: ftueSpear.carryingFishScale,
        hitFlash: 0,
        facingLeft: Math.cos(ftueSpear.angle) >= 0,
        rotation: 0,
        isAggressive: false,
        attackProgress: 0,
        isFleeing: false,
      } satisfies RenderFishState;
    }
    if (state.ftueHandTarget != null) {
      let best: RenderFishState | null = null;
      let bestD2 = Number.POSITIVE_INFINITY;
      for (const fish of state.fish) {
        const dx = fish.x - state.ftueHandTarget.x;
        const dy = fish.y - state.ftueHandTarget.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          best = fish;
          bestD2 = d2;
        }
      }
      if (best != null) return best;
    }
    if (state.ftuePrompt === 'catchTreasure') {
      return state.fish.find((fish) => fish.type === FishType.Treasure);
    }
    return state.fish[0];
  })();
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
function getFtueCtaCopy(state: RenderState): { title: string; body: string } {
  if (state.ftuePrompt === 'tapFightBack') {
    return {
      title: 'TAP TO FIGHT BACK',
      body: 'FINISH OFF THE SHARK!',
    };
  }
  if (state.ftuePrompt === 'treasureIntro') {
    return {
      title: 'TREASURE',
      body: 'WHAT IS INSIDE?',
    };
  }
  if (state.ftuePrompt === 'catchTreasure') {
    return {
      title: 'TREASURE',
      body: 'WHAT IS INSIDE?',
    };
  }
  if (state.ftuePrompt === 'catchFish') {
    return {
      title: 'TAP FISH TO CATCH',
      body: 'AIM AND FIRE TO REEL',
    };
  }
  if (state.ftuePrompt === 'useConsumables') {
    return {
      title: 'USE YOUR FREE GEAR',
      body: 'TAP BAIT AND NET TO TRY EACH CONSUMABLE.',
    };
  }
  if (state.ftuePrompt === 'useBait') {
    return {
      title: 'USE BAIT',
      body: 'TAP BAIT TO LURE FISH',
    };
  }
  if (state.ftuePrompt === 'useNet') {
    return {
      title: 'USE NET',
      body: 'USE NET FOR MASS CATCH',
    };
  }
  if (state.ftuePrompt === 'oxygenLimit') {
    return {
      title: 'OXYGEN',
      body: '+O2 FISH RESTORES OXYGEN',
    };
  }
  return {
    title: 'CATCH FISH · CASH IN',
    body: 'ONE TAP, FULL RUN. GET PAID ON EVERY CATCH.',
  };
}

function drawFtueCtaOnly(renderer: GameRenderer, state: RenderState): void {
  const H = CANVAS_HEIGHT;
  const W = CANVAS_WIDTH;
  const copy = getFtueCtaCopy(state);
  const isFightBack = state.ftuePrompt === 'tapFightBack';
  const useFightBackPlacement = isFightBack
    || state.ftuePrompt === 'catchTreasure'
    || state.ftuePrompt === 'catchFish'
    || state.ftuePrompt === 'useConsumables'
    || state.ftuePrompt === 'useBait'
    || state.ftuePrompt === 'useNet'
    || state.ftuePrompt === 'oxygenLimit';
  const isTreasure = state.ftuePrompt === 'treasureIntro' || state.ftuePrompt === 'catchTreasure';
  const bottomPad = useFightBackPlacement ? 210 : 24;
  const subH = useFightBackPlacement ? 52 : 40;
  const subY = H - bottomPad - subH;
  const headH = useFightBackPlacement ? 62 : 56;
  const headGap = useFightBackPlacement ? 4 : 8;
  const headY = subY - headGap - headH;
  const bandH = useFightBackPlacement ? 300 : 200;
  const bodyStyle = useFightBackPlacement || isTreasure ? tb(30, C.teal, 'center') : t(22, C.teal, 'center', '800');
  renderer.drawGradientRect('rgba(1,3,6,0)', 'rgba(1,3,6,0.52)', 0, H - bandH, W, bandH);
  if (copy.title !== '') renderer.drawText(copy.title, 0, headY, W, headH, td(isTreasure ? 46 : 42, C.white, 'center'));
  if (copy.body !== '') renderer.drawText(copy.body, 0, subY, W, subH, bodyStyle);
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
    const prizeY = drawT + baseH * 0.88;
    if (c.comboText != null) {
      const comboMult = c.comboText.replace(' COMBO', '');
      const pop = 1 + Math.max(0, 1 - Math.min(1, c.elapsedSinceAward / 0.25)) * 0.18;
      renderer.drawText(
        `${comboMult} APPLIED`,
        chestCx - 104,
        drawT + baseH * 0.70,
        208,
        24,
        { ...t(17, C.haul, 'center', '800'), strokeColor: 'rgba(3,10,16,0.86)', strokeWidth: 3 },
      );
      renderer.drawText(`${comboMult} -> ${c.prizeText}`, chestCx - 124, prizeY, 248, 38 * pop, td(27 * pop, C.gold, 'center'));
    } else {
      renderer.drawText(c.prizeText, chestCx - 100, prizeY, 200, 36, td(26, C.gold, 'center'));
    }
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
  const flight = TREASURE_MONEY_LERP_SEC + 0.34;
  const spread = 0.46 / Math.max(1, c.coinCount - 1);

  for (let i = 0; i < c.coinCount; i += 1) {
    const stagger = i * spread;
    let u = (c.elapsedSinceAward - stagger) / flight;
    if (u <= 0) continue;
    if (u > 1) u = 1;
    const ease = 1 - (1 - u) * (1 - u) * (1 - u);
    const wave = Math.sin(i * 12.9898) * 0.5 + 0.5;
    const fan = ((i % 9) - 4) * (10 + wave * 7);
    const startX = fromX + fan;
    const startY = fromY + ((i % 5) - 2) * 7;
    const arc = Math.sin(Math.PI * ease) * (88 + wave * 72);
    const wobble = Math.sin(ease * Math.PI * 2 + i * 0.8) * (1 - ease) * 20;
    const x = startX + (tx - startX) * ease + wobble;
    const y = startY + (ty - startY) * ease - arc;
    let a = 1;
    if (u < 0.1) a = u / 0.1;
    else if (u > 0.9) a = (1 - u) / 0.1;
    const sz = (20 + wave * 12) * (0.78 + 0.22 * ease);
    renderer.drawEllipseAlpha(C.gold, Math.min(0.35, a * 0.26), x, y, sz * 0.92, sz * 0.72);
    renderer.drawImageAlpha({ id: AssetIds.iconCoin }, x - sz / 2, y - sz / 2, sz, sz, Math.min(1, Math.max(0, a)));
  }
}

function drawCatchCoinBursts(renderer: GameRenderer, state: RenderState): void {
  if (state.catchCoinBursts.length === 0) return;
  const layout = getHudMoneyLayout(`${state.hudMoneyDisplay}`);
  const tx = layout.iconCx;
  const ty = layout.iconCy;
  const zoom = getActionViewZoomForSession(state.actionSessionTime, state.ftueActive);

  for (const burst of state.catchCoinBursts) {
    const raw = actionWorldToCanvas(
      burst.x,
      burst.y,
      state.shakeX,
      state.shakeY,
      state.player.x,
      state.player.y,
      zoom,
    );
    const fromX = raw.x;
    const fromY = raw.y;
    const flight = 0.72;
    const spread = 0.2 / Math.max(1, burst.coinCount - 1);

    for (let i = 0; i < burst.coinCount; i += 1) {
      const stagger = i * spread;
      let u = (burst.elapsed - stagger) / flight;
      if (u <= 0) continue;
      if (u > 1) u = 1;
      const ease = 1 - (1 - u) * (1 - u) * (1 - u);
      const wave = Math.sin((i + burst.value) * 9.173) * 0.5 + 0.5;
      const fan = ((i % 5) - 2) * (7 + wave * 5);
      const sx = fromX + fan;
      const sy = fromY + ((i % 3) - 1) * 5;
      const arc = Math.sin(Math.PI * ease) * (42 + wave * 36);
      const wobble = Math.sin(ease * Math.PI * 2 + i * 0.9) * (1 - ease) * 9;
      const x = sx + (tx - sx) * ease + wobble;
      const y = sy + (ty - sy) * ease - arc;
      let a = 1;
      if (u < 0.08) a = u / 0.08;
      else if (u > 0.88) a = (1 - u) / 0.12;
      const sz = (11 + wave * 8) * (0.78 + 0.22 * ease);
      const alpha = Math.max(0, Math.min(1, a));
      renderer.drawEllipseAlpha(C.gold, alpha * 0.18, x, y, sz * 0.9, sz * 0.7);
      renderer.drawImageAlpha({ id: AssetIds.iconCoin }, x - sz / 2, y - sz / 2, sz, sz, alpha);
    }
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

function netVfxSmoothstep01(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

function harpoonGunSlidePixels(elapsed: number): number {
  const hidden = HARPOON_GUN_SLIDE_HIDDEN_PX;
  if (elapsed < 0) return hidden;
  const riseEnd = HARPOON_GUN_ANIM_RISE_SEC;
  const total = HARPOON_GUN_ANIM_TOTAL_SEC;
  if (elapsed <= riseEnd) {
    const t = riseEnd > 1e-6 ? Math.min(1, Math.max(0, elapsed / riseEnd)) : 1;
    const u = netVfxSmoothstep01(t);
    return hidden * (1 - u);
  }
  const fallDur = Math.max(1e-6, total - riseEnd);
  const t = Math.min(1, Math.max(0, (elapsed - riseEnd) / fallDur));
  const u = netVfxSmoothstep01(t);
  return hidden * u;
}

/**
 * First-person harpoon: grip at the player anchor (bottom-centre), art extends upward; barrel follows `aimAngle`.
 * `slide` is extra +Y on the grip (larger = more hidden below the frame).
 */
function drawFirstPersonHarpoonGun(
  renderer: GameRenderer,
  state: RenderState,
  slide: number,
): void {
  const drawW = HARPOON_GUN_DRAW_W;
  const drawH = HARPOON_GUN_DRAW_H;
  const aim = state.player.aimAngle;
  const rotDeg = ((aim + Math.PI / 2) * 180) / Math.PI;
  const gripX = state.player.x;
  const gripY = state.player.y + slide;

  renderer.pushTranslate(gripX, gripY);
  renderer.pushRotate(rotDeg, 0, 0);
  renderer.drawImage({ id: AssetIds.gun1 }, -drawW * 0.5, -drawH, drawW, drawH);
  renderer.pop();
  renderer.pop();
}

function drawDiverCharacter(renderer: GameRenderer, yOffset = 0): void {
  const naturalW = 1024;
  const naturalH = 532;
  const drawW = 360;
  const drawH = (drawW * naturalH) / naturalW;
  const x = CANVAS_WIDTH * 0.5 - drawW * 0.5 - 70;
  const y = CANVAS_HEIGHT - drawH + 22 + yOffset;
  renderer.drawImage({ id: AssetIds.helmet }, x, y, drawW, drawH);
}

function drawUnderwaterPlayingField(renderer: GameRenderer, state: RenderState): void {
  const actionZoomed = state.phase === GamePhase.Action || state.phase === GamePhase.Breaching;
  const isFtue = state.phase === GamePhase.Action && state.ftueActive;
  const treasureFocus = state.ftuePrompt === 'treasureIntro' || state.ftuePrompt === 'catchFish'
    ? state.ftueHandTarget
    : null;
  const playerFocus = actionViewFocus(state.player.x, state.player.y);
  const focusBlend = treasureFocus == null ? 0 : state.ftueTreasureFocusBlend;
  const activeFocus = treasureFocus == null
    ? playerFocus
    : {
      x: playerFocus.x + (treasureFocus.x - playerFocus.x) * focusBlend,
      y: playerFocus.y + (treasureFocus.y - playerFocus.y) * focusBlend,
    };
  const zf = actionZoomed
    ? activeFocus
    : null;
  const baseActionZoom = getActionViewZoomForSession(state.actionSessionTime, state.ftueActive);
  const z =
    baseActionZoom
    * state.ftueTreasureZoom
    * (state.phase === GamePhase.Breaching ? (state.diveTransition?.breachCameraZoom ?? 1) : 1);
  const breachExitOffset = state.phase === GamePhase.Breaching
    ? (state.diveTransition?.breachPlayerExitOffset ?? 0)
    : 0;

  renderer.pushTranslate(state.shakeX, state.shakeY);
  if (actionZoomed && zf) {
    renderer.pushScale(z, z, zf.x, zf.y);
  }

  const dive = state.diveTransition;
  const useBaseUnderwaterOnly = state.phase === GamePhase.Breaching && dive?.backdrop != null;
  if (useBaseUnderwaterOnly) {
    drawBackground(renderer);
  } else if (dive?.backdrop != null) {
    drawDiveMaskedBackdrops(renderer, dive);
  } else {
    drawBackground(renderer);
  }

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
  if (isFtue || state.ftuePrompt === 'catchTreasure' || state.ftuePrompt === 'catchFish' || state.ftuePrompt === 'oxygenLimit') {
    drawFtueHandWorld(renderer, state);
  }

  let tetherMuzzleX = state.player.x;
  let tetherMuzzleY = state.player.y;
  let gunSlide = 0;
  if (actionZoomed) {
    gunSlide = harpoonGunSlidePixels(state.harpoonGunAnimElapsed);
    const gripY = state.player.y + gunSlide + breachExitOffset;
    const muzzleW = getHarpoonMuzzleWorldFromGrip(
      state.player.x,
      gripY,
      state.player.aimAngle,
    );
    tetherMuzzleX = muzzleW.x;
    tetherMuzzleY = muzzleW.y;
  } else {
    const muzzleW = getHarpoonMuzzleWorldFromGrip(
      state.player.x,
      state.player.y,
      state.player.aimAngle,
    );
    tetherMuzzleX = muzzleW.x;
    tetherMuzzleY = muzzleW.y;
  }
  for (const spear of state.spears) drawSpearTether(renderer, tetherMuzzleX, tetherMuzzleY, spear);
  if (actionZoomed) {
    drawFirstPersonHarpoonGun(renderer, state, gunSlide + breachExitOffset);
  }
  for (const spear of state.spears) drawSpearBody(renderer, spear);
  if (actionZoomed) {
    drawDiverCharacter(renderer, breachExitOffset);
  }
  drawParticles(renderer, state.particles);
  drawFloatingTexts(renderer, state.floatingTexts);
  if (actionZoomed) {
    renderer.pop();
  }
  renderer.pop();
}

const VFX_NET_NATURAL_W = 1024;
const VFX_NET_NATURAL_H = 1536;

/** Screen-space net sweep: below HUD, above world (drawn after `drawUnderwaterPlayingField`). */
function drawNetConsumableVfx(renderer: GameRenderer, elapsed: number): void {
  if (elapsed < 0 || elapsed >= NET_VFX_TOTAL_SEC) return;

  const p = netVfxSmoothstep01(Math.min(1, elapsed / NET_VFX_SLIDE_GROW_SEC));
  const scaleCover = Math.max(CANVAS_WIDTH / VFX_NET_NATURAL_W, CANVAS_HEIGHT / VFX_NET_NATURAL_H);
  const scaleMin = 0.2;
  const s = scaleCover * (scaleMin + (1 - scaleMin) * p);
  const drawW = VFX_NET_NATURAL_W * s;
  const drawH = VFX_NET_NATURAL_H * s;

  const cx = CANVAS_WIDTH * 0.5;
  const cyStart = CANVAS_HEIGHT + drawH * 0.42;
  const cyEnd = CANVAS_HEIGHT * 0.46;
  const cy = cyStart + (cyEnd - cyStart) * p;

  let alpha = 1;
  if (elapsed > NET_VFX_SLIDE_GROW_SEC) {
    const u = (elapsed - NET_VFX_SLIDE_GROW_SEC) / NET_VFX_FADE_SEC;
    alpha = 1 - netVfxSmoothstep01(Math.min(1, Math.max(0, u)));
  }
  if (alpha <= 0.004) return;

  renderer.drawImageAlpha(
    { id: AssetIds.vfxNet },
    cx - drawW * 0.5,
    cy - drawH * 0.5,
    drawW,
    drawH,
    alpha,
  );
}

function drawCatchFlashOverlay(renderer: GameRenderer, state: RenderState): void {
  const f = state.catchFlash;
  renderer.drawRectAlpha('#fff4e0', f * 0.38, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  renderer.drawRectAlpha('#8cf0ff', f * 0.06, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawSharkBiteFlashOverlay(renderer: GameRenderer, state: RenderState): void {
  const f = state.sharkBiteFlash;
  renderer.drawRectAlpha('#ff1717', f * 0.34, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  renderer.drawRectAlpha('#2a0000', f * 0.14, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/** Natural pixel size of bite art (for aspect-correct scaling). */
const SHARK_BITE_TOP_NATURAL_W = 1104;
const SHARK_BITE_TOP_NATURAL_H = 511;
const SHARK_BITE_BOTTOM_NATURAL_W = 1040;
const SHARK_BITE_BOTTOM_NATURAL_H = 425;
const SHARK_BITE_CLAMPED_NATURAL_W = 1129;
const SHARK_BITE_CLAMPED_NATURAL_H = 681;

function sharkBiteSmoothstep01(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

function drawSharkBiteTeeth(renderer: GameRenderer, elapsed: number): void {
  const meetY = CANVAS_HEIGHT * 0.46;
  const approach = SHARK_BITE_VFX_APPROACH_SEC;

  if (elapsed < approach) {
    const p = sharkBiteSmoothstep01(elapsed / approach);
    const topDrawW = CANVAS_WIDTH;
    const topDrawH = (topDrawW * SHARK_BITE_TOP_NATURAL_H) / SHARK_BITE_TOP_NATURAL_W;
    const botDrawW = CANVAS_WIDTH;
    const botDrawH = (botDrawW * SHARK_BITE_BOTTOM_NATURAL_H) / SHARK_BITE_BOTTOM_NATURAL_W;

    const ty0 = -topDrawH * 0.78;
    const ty1 = meetY - topDrawH;
    const ty = ty0 + (ty1 - ty0) * p;

    const by0 = CANVAS_HEIGHT - botDrawH * 0.06;
    const by1 = meetY;
    const by = by0 + (by1 - by0) * p;

    renderer.drawImage({ id: AssetIds.vfxTeethTop }, 0, ty, topDrawW, topDrawH);
    renderer.drawImage({ id: AssetIds.vfxTeethBottom }, 0, by, botDrawW, botDrawH);
    return;
  }

  const fadeStart = approach + SHARK_BITE_VFX_CLAMP_JITTER_SEC;
  const fadeDur = SHARK_BITE_VFX_TOTAL_SEC - fadeStart;
  let alpha = 1;
  if (elapsed >= fadeStart && fadeDur > 1e-6) {
    alpha = 1 - sharkBiteSmoothstep01((elapsed - fadeStart) / fadeDur);
  }
  if (alpha <= 0.008) return;

  const clampW = CANVAS_WIDTH * 0.94;
  const clampH = (clampW * SHARK_BITE_CLAMPED_NATURAL_H) / SHARK_BITE_CLAMPED_NATURAL_W;
  const cx = CANVAS_WIDTH * 0.5;
  const cy = meetY;

  const jitterFadeSec = 0.14;
  const jitterBlend = elapsed >= fadeStart
    ? Math.max(0, 1 - (elapsed - fadeStart) / jitterFadeSec)
    : 1;
  const jx = (Math.sin(elapsed * 62) * 5 + Math.sin(elapsed * 107 + 1.2) * 2.5) * jitterBlend;
  const jy = (Math.cos(elapsed * 54 + 0.7) * 4 + Math.sin(elapsed * 88) * 2) * jitterBlend;

  const xL = cx - clampW * 0.5 + jx;
  const yT = cy - clampH * 0.5 + jy;

  renderer.pushOpacity(alpha);
  renderer.drawImage({ id: AssetIds.vfxTeethClamped }, xL, yT, clampW, clampH);
  renderer.popOpacity();
}

function drawBreachLeaderboardOverlay(renderer: GameRenderer, state: RenderState, alpha: number): void {
  if (alpha <= 0.004) return;

  const w = CANVAS_WIDTH - 72;
  const h = 490;
  const x = (CANVAS_WIDTH - w) / 2;
  const y = Math.round(CANVAS_HEIGHT * 0.405);
  renderer.pushOpacity(alpha);
  renderer.drawRectAlpha(C.bg, 0.52, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const logoW = Math.min(390, CANVAS_WIDTH - 34);
  const logoH = logoW / 1.58;
  renderer.drawImage({ id: AssetIds.gameLogo }, (CANVAS_WIDTH - logoW) / 2, CANVAS_HEIGHT * 0.13, logoW, logoH);

  renderer.drawRoundRectAlpha(Boat.card, 0.96, x, y, w, h, 22);
  renderer.drawRoundRectAlpha(C.teal, 0.12, x + 4, y + 4, w - 8, h - 8, 18);

  renderer.drawText('DIVE COMPLETE', x, y + 26, w, 30, t(17, C.muted, 'center', '800'));
  renderer.drawText(`${state.sessionCatchCount} FISH CAUGHT`, x, y + 62, w, 44, tb(31, C.gold, 'center'));
  renderer.drawText(`+$${state.sessionEarnings}`, x, y + 112, w, 32, tb(23, C.white, 'center'));

  const listY = y + 204;
  renderer.drawText('LEADERBOARD', x + 24, listY - 34, w - 48, 24, t(17, C.teal, 'left', '800'));
  const rows = state.leaderboard.entries
    .map((entry) => entry.isPlayer
      ? { ...entry, fishCaught: Math.max(entry.fishCaught, state.sessionCatchCount) }
      : entry)
    .sort((a, b) => b.fishCaught - a.fishCaught)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, 5);
  for (let i = 0; i < rows.length; i += 1) {
    const entry = rows[i]!;
    const rowY = listY + i * 42;
    const isPlayer = entry.isPlayer;
    renderer.drawRoundRectAlpha(isPlayer ? C.gold : C.border, isPlayer ? 0.18 : 0.22, x + 22, rowY, w - 44, 34, 11);
    renderer.drawText(`#${entry.rank}`, x + 36, rowY + 4, 48, 26, tb(16, isPlayer ? C.gold : C.muted, 'left'));
    renderer.drawText(entry.name, x + 92, rowY + 4, 170, 26, t(17, C.white, 'left', '800'));
    renderer.drawText(`${entry.fishCaught}`, x + w - 94, rowY + 4, 58, 26, tb(18, isPlayer ? C.gold : C.white, 'right'));
  }
  renderer.drawText('Tap anywhere to continue', x, y + h - 50, w, 24, t(16, C.muted, 'center', '800'));
  renderer.popOpacity();
}

function drawActionSurfaceOverlays(renderer: GameRenderer, state: RenderState): void {
  const isBreach = state.phase === GamePhase.Breaching;
  const dualOverHud = isBreach && state.diveTransition?.backdrop != null;
  const actionOrBreach = state.phase === GamePhase.Action || isBreach;

  if (actionOrBreach && state.catchFlash > 0 && !dualOverHud) {
    drawCatchFlashOverlay(renderer, state);
  }
  if ((state.phase === GamePhase.Action && !state.ftueActive) || isBreach) {
    drawHud(renderer, state);
  }
  if (dualOverHud && state.diveTransition != null) {
    drawDiveBackdropWipe(renderer, state.diveTransition);
  }
  if (actionOrBreach && state.catchFlash > 0 && dualOverHud) {
    drawCatchFlashOverlay(renderer, state);
  }
  if (
    state.phase === GamePhase.Action
    && (
      state.ftueActive
      || state.ftuePrompt === 'catchFish'
      || state.ftuePrompt === 'catchTreasure'
      || state.ftuePrompt === 'useConsumables'
      || state.ftuePrompt === 'useBait'
      || state.ftuePrompt === 'useNet'
      || state.ftuePrompt === 'oxygenLimit'
    )
  ) {
    drawFtueCtaOnly(renderer, state);
  }
  if (actionOrBreach && state.sharkBiteFlash > 0 && !dualOverHud) {
    drawSharkBiteFlashOverlay(renderer, state);
  }
  if (actionOrBreach && state.sharkBiteFlash > 0 && dualOverHud) {
    drawSharkBiteFlashOverlay(renderer, state);
  }
  if (actionOrBreach && state.sharkBiteTeethElapsed >= 0) {
    drawSharkBiteTeeth(renderer, state.sharkBiteTeethElapsed);
  }
  if (state.treasureCinematic != null) {
    drawTreasureCinematicOverlay(renderer, state);
    drawTreasureFlyingCoins(renderer, state);
  }
  drawCatchCoinBursts(renderer, state);
}

export function renderFrame(renderer: GameRenderer, state: RenderState): void {
  renderer.clear();

  if (state.phase === GamePhase.Boat) {
    drawBoatScreen(renderer, state);
    return;
  }

  if (state.phase === GamePhase.Diving) {
    drawDiveTransitionFull(renderer, state);
    return;
  }

  if (state.phase === GamePhase.Breaching && state.diveTransition?.breachShowBoatRevealOnly) {
    const a = state.diveTransition.breachBoatRevealAlpha;
    if (a < 0.999) renderer.pushOpacity(a);
    drawBoatScreen(renderer, state);
    if (a < 0.999) renderer.popOpacity();
    return;
  }

  drawUnderwaterPlayingField(renderer, state);
  if (
    (state.phase === GamePhase.Action || state.phase === GamePhase.Breaching)
    && state.netVfx != null
  ) {
    drawNetConsumableVfx(renderer, state.netVfx.elapsed);
  }
  const breachUiAlpha = state.phase === GamePhase.Breaching
    ? (state.diveTransition?.breachUiAlpha ?? 1)
    : 1;
  if (breachUiAlpha > 0.002) {
    if (breachUiAlpha < 0.999) renderer.pushOpacity(breachUiAlpha);
    drawActionSurfaceOverlays(renderer, state);
    if (breachUiAlpha < 0.999) renderer.popOpacity();
  }

  if (state.phase === GamePhase.Breaching && state.diveTransition != null) {
    // The wipe backdrop must not be tied to HUD opacity; once the waterline moves,
    // the boat background should already be visible beneath it.
    drawDiveBackdropWipe(renderer, state.diveTransition);
    drawBreachLeaderboardOverlay(renderer, state, state.diveTransition.breachLeaderboardAlpha);
    const a = state.diveTransition.breachBoatRevealAlpha;
    if (a > 0.002) {
      if (a < 0.999) renderer.pushOpacity(a);
      drawBoatScreen(renderer, state);
      if (a < 0.999) renderer.popOpacity();
    }
    drawDiveWaterlineVfx(renderer, state.diveTransition);
  }
}
