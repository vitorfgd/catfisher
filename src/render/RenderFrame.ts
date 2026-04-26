import type { GameRenderer } from './GameRenderer';
import type { RenderFishState, RenderSpearState, RenderState } from './RenderState';
import { FishType, GamePhase } from '../core/Types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import { drawBoatScreen } from './boatScreen';
import { drawHud } from './hud';
import { C, tb } from './theme';

const PLAYER_SPRITE_W = 164;
const PLAYER_SPRITE_H = 164;
const GUN_TIP_X = 65;
const GUN_TIP_Y = 86;

const FISH_IMAGE_IDS: Record<FishType, string> = {
  [FishType.Small]: AssetIds.fishSmall,
  [FishType.Medium]: AssetIds.fishMedium,
  [FishType.Large]: AssetIds.fishLarge,
  [FishType.Rare]: AssetIds.fishRare,
  [FishType.Jelly]: AssetIds.fishJelly,
  [FishType.Puffer]: AssetIds.fishPuffer,
  [FishType.Treasure]: AssetIds.fishTreasure,
  [FishType.Boss]: AssetIds.fishBoss,
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
};

const FISH_ASPECT_RATIO: Record<FishType, number> = {
  [FishType.Small]: 350 / 250,
  [FishType.Medium]: 614 / 406,
  [FishType.Large]: 366 / 202,
  [FishType.Rare]: 653 / 382,
  [FishType.Jelly]: 0.85,
  [FishType.Puffer]: 1.0,
  [FishType.Treasure]: 1.3,
  [FishType.Boss]: 1.0,
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
): void {
  const w = FISH_DRAW_WIDTH[type] * scale;
  const h = w / FISH_ASPECT_RATIO[type];
  const ref = { id: FISH_IMAGE_IDS[type] };
  const now = Date.now();

  if (type === FishType.Rare) {
    const lurePulse = 0.55 + 0.45 * Math.sin(now / 200);
    const lureX = facingLeft ? x - w * 0.32 : x + w * 0.32;
    const lureY = y - h * 0.12;
    renderer.drawEllipseAlpha('#ffe090', lurePulse * 0.45, lureX, lureY, 14, 14);
    renderer.drawEllipse('#fff8b0', lureX, lureY, 4, 4);
  }

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
      'SIEGE FISH',
      x - 120,
      y - h / 2 - 32,
      240,
      22,
      { ...tb(18, `rgba(255,60,50,${a})`, 'center'), strokeColor: 'rgba(3,10,16,0.9)', strokeWidth: 3 },
    );
  }

  if (isAggressive) {
    const aggroPulse = 0.55 + 0.45 * Math.sin(now / 180);
    const alpha = (0.75 + aggroPulse * 0.25).toFixed(2);
    renderer.drawText(
      'CAREFUL',
      x - 44,
      y - h / 2 - 22,
      88,
      20,
      { ...tb(15, `rgba(255,60,30,${alpha})`, 'center'), strokeColor: 'rgba(3,10,16,0.85)', strokeWidth: 3 },
    );
  }

  renderer.pushTranslate(x, y);
  if (Math.abs(rotation) > 0.008) renderer.pushRotate((rotation * 180) / Math.PI, 0, 0);
  if (facingLeft && type !== FishType.Jelly) renderer.pushScale(-1, 1, 0, 0);

  renderer.drawImage(ref, -w / 2, -h / 2, w, h);
  if (hitFlash > 0.05) renderer.drawRectAlpha('#ffffff', hitFlash * 0.5, -w / 2, -h / 2, w, h);

  if (facingLeft && type !== FishType.Jelly) renderer.pop();
  if (Math.abs(rotation) > 0.008) renderer.pop();
  renderer.pop();
}

function drawFish(renderer: GameRenderer, fish: RenderFishState): void {
  drawFishSprite(renderer, fish.x, fish.y, fish.type, fish.facingLeft, fish.hitFlash, fish.rotation, fish.isAggressive);
}

function drawPlayer(renderer: GameRenderer, px: number, py: number, aimAngle: number): void {
  const drawY = py - PLAYER_SPRITE_H;
  const facingRight = Math.cos(aimAngle) >= 0;
  if (facingRight) {
    renderer.drawImage({ id: AssetIds.playerCat }, px - PLAYER_SPRITE_W / 2, drawY, PLAYER_SPRITE_W, PLAYER_SPRITE_H);
  } else {
    renderer.pushTranslate(px + PLAYER_SPRITE_W / 2, drawY);
    renderer.pushScale(-1, 1, 0, 0);
    renderer.drawImage({ id: AssetIds.playerCat }, 0, 0, PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    renderer.pop();
    renderer.pop();
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

function drawSpear(
  renderer: GameRenderer,
  playerX: number,
  playerY: number,
  aimAngle: number,
  spear: RenderSpearState,
): void {
  const right = Math.cos(aimAngle) >= 0;
  drawTether(renderer, playerX + (right ? GUN_TIP_X : -GUN_TIP_X), playerY - GUN_TIP_Y, spear.x, spear.y);
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
      0.75,
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

  renderer.pushTranslate(state.shakeX, state.shakeY);
  drawBackground(renderer);

  if (state.baitActive) {
    const bp = 0.5 + 0.5 * Math.sin(Date.now() / 220);
    renderer.drawEllipseAlpha(C.amber, 0.12 + bp * 0.14, state.baitX, state.baitY, 48, 36);
    renderer.drawEllipseAlpha(C.amber, 0.30 + bp * 0.20, state.baitX, state.baitY, 22, 16);
    renderer.drawEllipse(C.gold, state.baitX, state.baitY, 6, 6);
    const rings = Math.ceil(state.baitFraction * 4);
    for (let i = 0; i < rings; i += 1) {
      renderer.drawEllipseAlpha(C.amber, 0.18 + bp * 0.10, state.baitX, state.baitY, 34 + i * 6, 26 + i * 4);
    }
  }

  for (const fish of state.fish) drawFish(renderer, fish);
  for (const spear of state.spears) drawSpear(renderer, state.player.x, state.player.y, state.player.aimAngle, spear);
  drawPlayer(renderer, state.player.x, state.player.y, state.player.aimAngle);
  drawParticles(renderer, state.particles);
  drawFloatingTexts(renderer, state.floatingTexts);
  renderer.pop();

  if (state.phase === GamePhase.Action && state.bossScreenTint > 0) {
    renderer.drawRectAlpha('#ff2020', state.bossScreenTint, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  if (state.phase === GamePhase.Action && state.catchFlash > 0) {
    const f = state.catchFlash;
    renderer.drawRectAlpha('#fff4e0', f * 0.38, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.drawRectAlpha('#8cf0ff', f * 0.06, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  if (state.phase === GamePhase.Action) drawHud(renderer, state);
  if (state.phase === GamePhase.Diving && state.diveAlpha < 1) {
    renderer.drawRectAlpha(C.bg, 1 - state.diveAlpha, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}
