import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import type { UpgradeState } from '../core/Types';
import { GamePhase } from '../core/Types';
import {
  BAIT_COST,
  BAIT_MAX_STOCK,
  BOAT_CONTENT_TEXT_PAD_X,
  BOAT_MENU_DIVE_BUTTON_INNER_PAD_X,
  BOAT_MENU_SECTION_CARD_PAD_Y,
  BOAT_SECTION_CONTENT_W,
  BOAT_SECTION_CONTENT_X,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getBoatBackgroundDrawRect,
  getBoatSpriteDrawRect,
  BOAT_SCENE_SKY_NATURAL_H,
  BOAT_SCENE_SKY_NATURAL_W,
  BOAT_SCENE_SURFACE_1_DRAW_H,
  BOAT_SCENE_SURFACE_1_TOP_Y,
  BOAT_SCENE_SURFACE_2_DRAW_H,
  BOAT_SCENE_SURFACE_2_TOP_Y,
  BOAT_SCENE_SURFACE_3_DRAW_H,
  BOAT_SCENE_SURFACE_3_TOP_Y,
  BOAT_SCENE_SURFACE_4_DRAW_H,
  BOAT_SCENE_SURFACE_4_TOP_Y,
  BOAT_SCENE_SURFACE_5_DRAW_H,
  BOAT_SCENE_SURFACE_DRAW_W,
  CONSUMABLE_GAP,
  CONSUMABLE_H,
  CONSUMABLE_W,
  CONSUMABLE_Y,
  GEAR_HEADER_LABEL_Y,
  DIVE_BUTTON_HEIGHT,
  DIVE_BUTTON_LABEL_Y_OFFSET,
  DIVE_BUTTON_Y,
  NET_COST,
  NET_MAX_STOCK,
  SECTION_HEADER_BLOCK_H,
  UPGRADE_MARGIN,
  UPGRADE_SECTION_HEADER_GAP,
  UPGRADE_MAX_LEVEL,
  UPGRADE_PANEL_BUY_H,
  UPGRADE_PANEL_BUY_Y,
  UPGRADE_LAST_ROW_BOTTOM,
  getBoatStatsCardTopY,
} from '../core/Constants';
import { DIVE_TRANSITION } from '../core/diveTransitionConfig';
import { AssetIds } from '../shared/AssetIds';
import { FTUE_HAND_MAX_SPAN_BOAT_PX, getFtueHandDrawSize } from '../shared/FtueHandLayout';
import { getBoatContentColumn, getBoatStatsColumnLayout } from '../shared/BoatUiLayout';
import { getBoatLeaderboardFabLayout } from '../shared/LeaderboardOverlayLayout';
import { getUpgradeButtonRect, UPGRADE_KEYS } from '../shared/UiLayout';
import { drawLeaderboardBoatModal } from './leaderboardModal';
import { Boat, C, t, tb } from './theme';
import {
  CONSUMABLE_NAMES,
  getUpgradeStatLines,
  UPGRADE_LABELS,
  UPGRADE_LEVEL_NAMES,
  UPGRADE_LEVEL_SPRITES,
  UPGRADE_SUBTEXT,
} from './upgradePresentation';

function drawBoatLeaderboardFab(renderer: GameRenderer): void {
  const { cx, cy, d } = getBoatLeaderboardFabLayout();
  const x = cx - d / 2;
  const y = cy - d / 2;
  const corner = d * 0.5;
  renderer.drawRoundRect(Boat.diveShadow, x, y + 3, d, d, corner);
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.1, x - 2, y - 2, d + 4, d + 4, corner + 2);
  renderer.drawRoundRect(Boat.dive, x, y, d, d, corner);
  const flatW = d - 18;
  if (flatW > 0) {
    renderer.drawRect(Boat.diveTopBevel, cx - flatW / 2, y + 2, flatW, 1);
  }
  const iconSz = Math.round(d * 0.52 * 1.2);
  const iconX = Math.round(cx - iconSz / 2);
  const iconY = Math.round(cy - iconSz / 2);
  renderer.drawImage({ id: AssetIds.uiLeaderboard }, iconX, iconY, iconSz, iconSz);
}

const CONSUMABLE_ICON_IDS: Record<'net' | 'bait', string> = {
  net: AssetIds.iconNet,
  bait: AssetIds.iconBait,
};

const BOAT_STANDING_DIVER_RENDER_OFFSET_Y = 20;

/** Matches upgrade / gear row `drawRoundRect` radius — highlight spans the flat top span between corners. */
const ROW_CARD_CORNER_R = 14;

function drawRowCardTopEdge(renderer: GameRenderer, x: number, y: number, width: number): void {
  const flatW = width - 2 * ROW_CARD_CORNER_R;
  if (flatW <= 0) return;
  renderer.drawRect(Boat.rowCardTopEdge, x + ROW_CARD_CORNER_R, y + 1, flatW, 1);
}

/** GO FISH uses the same corner radius as row cards (`drawRoundRect(..., 14)`). */
function drawDiveButtonTopEdge(renderer: GameRenderer, x: number, y: number, width: number): void {
  const flatW = width - 2 * ROW_CARD_CORNER_R;
  if (flatW <= 0) return;
  renderer.drawRect(Boat.diveTopBevel, x + ROW_CARD_CORNER_R, y + 1, flatW, 1);
}

function drawUpgradeButton(
  renderer: GameRenderer,
  id: keyof UpgradeState,
  level: number,
  cost: number,
  canAfford: boolean,
  _isOpen: boolean,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const maxed = level >= UPGRADE_MAX_LEVEL;

  renderer.drawRoundRect(Boat.rowCard, x, y, width, height, ROW_CARD_CORNER_R);
  drawRowCardTopEdge(renderer, x, y, width);

  const iconZone = height;
  const iconPad = 8;
  const iconSz = iconZone - iconPad * 2;
  const sprite = UPGRADE_LEVEL_SPRITES[id][level - 1];
  renderer.drawRadialGradientRoundRect(
    Boat.iconSquareCenter,
    Boat.iconSquareEdge,
    x + 2,
    y + 2,
    iconZone - 4,
    height - 4,
    12,
  );
  renderer.drawImage({ id: sprite }, x + iconPad, y + iconPad, iconSz, iconSz);

  const infoX = x + iconZone + 12;
  const infoW = width - iconZone - 96;
  const subStyle = { ...t(14, Boat.labelMuted, 'left', '500'), useLayoutMaxWidth: false } as const;
  renderer.drawText(UPGRADE_LEVEL_NAMES[id][level - 1], infoX, y + 6, infoW, 28, t(19, C.white, 'left', '800'));
  renderer.drawText(UPGRADE_SUBTEXT[id], infoX, y + 28, infoW, 38, subStyle);

  const pipY = y + 72;
  const pipR = 6;
  const pip0 = infoX + pipR;
  const pipGap = 16;
  for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) {
    const cx = pip0 + i * pipGap;
    renderer.drawEllipse(i < level ? Boat.menuAccent : Boat.pipEmpty, cx, pipY, pipR, pipR);
  }

  const costLabel = maxed ? 'MAX' : `$${cost}`;
  const costColor = maxed ? C.gold : canAfford ? C.teal : C.muted;
  renderer.drawText(costLabel, x + width - 72, y + 38, 64, 30, tb(19, costColor, 'right'));
}

function drawUpgradePanel(renderer: GameRenderer, state: RenderState, id: keyof UpgradeState): void {
  const level = state.upgrades[id];
  const maxed = level >= UPGRADE_MAX_LEVEL;
  const cost = state.upgradeCosts[id];
  const canAfford = state.canAfford[id];
  const accent = maxed ? C.gold : C.teal;
  const M = UPGRADE_MARGIN;
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  renderer.drawRectAlpha(C.bg, 0.96, 0, 0, W, H);

  const HDR_H = 80;
  renderer.drawRectAlpha(Boat.card, 0.98, 0, 0, W, HDR_H);
  renderer.drawRectAlpha(Boat.sectionMint, 0.45, 0, HDR_H - 2, W, 2);
  if (state.upgradeBackHighlight) {
    renderer.drawRoundRectAlpha(C.gold, 0.18, M - 10, 16, 126, 48, 14);
    renderer.drawRoundRectAlpha(C.gold, 0.34, M - 8, 18, 122, 44, 13);
    renderer.drawText('← BACK', M, 0, 132, HDR_H, tb(22, C.gold, 'left'));
  } else {
    renderer.drawText('← BACK', M, 0, 120, HDR_H, t(18, C.muted, 'left', '700'));
  }
  renderer.drawText(UPGRADE_LABELS[id], 0, 0, W, HDR_H, tb(28, C.white, 'center'));

  const curName = UPGRADE_LEVEL_NAMES[id][level - 1];
  renderer.drawText(`Level ${level}  ·  ${curName}`, M, HDR_H + 12, W - M * 2, 28, t(18, C.muted, 'center'));
  const pipStartX = W / 2 - (UPGRADE_MAX_LEVEL * 16) / 2 + 8;
  for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) {
    renderer.drawEllipse(i < level ? Boat.menuAccent : Boat.pipEmpty, pipStartX + i * 16, HDR_H + 52, 6, 6);
  }

  const SZ = 200;
  const GAP = 24;
  const LBL_H = 22;
  const NAME_H = 30;
  const statLines = maxed ? getUpgradeStatLines(id, level) : getUpgradeStatLines(id, level + 1);
  const statLineCount = statLines.filter(Boolean).length;
  const cardH = statLineCount * 36 + 36;
  const blockH = SZ + GAP + LBL_H + NAME_H + GAP + cardH;
  const areaTop = HDR_H + 62;
  const areaBot = UPGRADE_PANEL_BUY_Y;
  const blockTop = areaTop + Math.round((areaBot - areaTop - blockH) / 2);

  const sprX = W / 2 - SZ / 2;
  const sprY = blockTop;
  const curSprite = UPGRADE_LEVEL_SPRITES[id][level - 1];

  if (!maxed) {
    const nextSprite = UPGRADE_LEVEL_SPRITES[id][level];
    const nextName = UPGRADE_LEVEL_NAMES[id][level];
    renderer.drawRoundRect(Boat.iconSquare, sprX - 10, sprY - 10, SZ + 20, SZ + 20, 16);
    renderer.drawImage({ id: nextSprite }, sprX, sprY, SZ, SZ);

    const lblY = sprY + SZ + GAP;
    renderer.drawText('NEXT LEVEL', 0, lblY, W, LBL_H, t(15, C.muted, 'center', '700'));
    renderer.drawText(nextName, 0, lblY + LBL_H, W, NAME_H, tb(22, accent, 'center'));

    const statCardY = lblY + LBL_H + NAME_H + GAP;
    renderer.drawRoundRectAlpha(C.border, 0.25, M, statCardY, W - M * 2, cardH, 14);
    renderer.drawText('AFTER UPGRADE', M, statCardY + 8, W - M * 2, 22, t(14, C.muted, 'center', '700'));
    let off = 0;
    for (const line of statLines) {
      if (!line) continue;
      renderer.drawText(line, M, statCardY + 32 + off, W - M * 2, 28, t(18, accent, 'center'));
      off += 36;
    }
  } else {
    renderer.drawRoundRect(Boat.iconSquare, sprX - 10, sprY - 10, SZ + 20, SZ + 20, 16);
    renderer.drawImage({ id: curSprite }, sprX, sprY, SZ, SZ);

    const lblY = sprY + SZ + GAP;
    renderer.drawText('MAX LEVEL', 0, lblY, W, LBL_H, t(15, C.muted, 'center', '700'));
    renderer.drawText(curName, 0, lblY + LBL_H, W, NAME_H, tb(22, C.gold, 'center'));

    const statCardY = lblY + LBL_H + NAME_H + GAP;
    renderer.drawRoundRectAlpha(C.border, 0.25, M, statCardY, W - M * 2, cardH, 14);
    renderer.drawText('CURRENT STATS', M, statCardY + 8, W - M * 2, 22, t(14, C.muted, 'center', '700'));
    let off = 0;
    for (const line of statLines) {
      if (!line) continue;
      renderer.drawText(line, M, statCardY + 32 + off, W - M * 2, 28, t(18, C.gold, 'center'));
      off += 36;
    }
  }

  const bbY = UPGRADE_PANEL_BUY_Y;
  const bbH = UPGRADE_PANEL_BUY_H;
  if (!maxed) {
    if (canAfford) {
      renderer.drawRoundRect(Boat.dive, M, bbY, W - M * 2, bbH, 14);
      renderer.drawRoundRectAlpha('#fff', 0.10, M + 4, bbY + 3, W - M * 2 - 8, 18, 10);
      renderer.drawText(`UPGRADE  $${cost}`, M, bbY + DIVE_BUTTON_LABEL_Y_OFFSET, W - M * 2, bbH, {
        ...t(32, Boat.card, 'center', '800'),
        useLayoutMaxWidth: false,
      });
    } else {
      renderer.drawRoundRectAlpha(C.panel, 0.96, M, bbY, W - M * 2, bbH, 14);
      renderer.drawText(`$${cost - state.money} MORE NEEDED`, M, bbY, W - M * 2, bbH, t(18, C.muted, 'center'));
    }
  } else {
    renderer.drawRoundRectAlpha(C.panel, 0.96, M, bbY, W - M * 2, bbH, 14);
    renderer.drawText('MAX LEVEL REACHED', M, bbY, W - M * 2, bbH, t(18, C.gold, 'center'));
  }
}

function drawConsumableCard(
  renderer: GameRenderer,
  id: 'net' | 'bait',
  stock: number,
  maxStock: number,
  cost: number,
  canAfford: boolean,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const stocked = stock >= maxStock;
  const costC = stocked ? C.gold : canAfford ? C.amber : C.muted;

  renderer.drawRoundRect(Boat.rowCard, x, y, width, height, ROW_CARD_CORNER_R);
  drawRowCardTopEdge(renderer, x, y, width);

  const iconAreaSz = height;
  const iconPad = 8;
  const iconSz = iconAreaSz - iconPad * 2;
  renderer.drawRadialGradientRoundRect(
    Boat.iconSquareCenter,
    Boat.iconSquareEdge,
    x + 2,
    y + 2,
    iconAreaSz - 4,
    height - 4,
    12,
  );
  renderer.drawImage({ id: CONSUMABLE_ICON_IDS[id] }, x + iconPad, y + iconPad, iconSz, iconSz);

  const infoX = x + iconAreaSz + 12;
  const infoW = width - (infoX - x) - 72;
  const noFit = { useLayoutMaxWidth: false } as const;
  renderer.drawText(CONSUMABLE_NAMES[id], infoX, y + 18, infoW, 36, t(20, C.white, 'left', '800', noFit));

  const pipY = y + 60;
  const pipR = 6;
  const pip0 = infoX + pipR;
  const pipGap = 16;
  for (let i = 0; i < maxStock; i += 1) {
    const cx = pip0 + i * pipGap;
    renderer.drawEllipse(i < stock ? Boat.menuAccent : Boat.pipEmpty, cx, pipY, pipR, pipR);
  }
  renderer.drawText(stocked ? 'FULL' : `$${cost}`, x + width - 72, y + 32, 64, 30, tb(19, costC, 'right', noFit));
}

function drawSectionHeader(
  renderer: GameRenderer,
  x: number,
  y: number,
  w: number,
  label: string,
  accent: string,
): void {
  const H = SECTION_HEADER_BLOCK_H;
  renderer.drawRectAlpha(accent, 0.85, x, y + 8, 4, 28);
  renderer.drawText(label, x + 12, y + 4, w - 12, H - 14, t(30, accent, 'left', '800'));
}

function easedLoopOffset(amplitude: number, durationSec: number, phaseRad: number): number {
  return Math.sin((Date.now() / 1000 / durationSec) * Math.PI * 2 + phaseRad) * amplitude;
}

function drawSurfaceLayer(
  renderer: GameRenderer,
  assetId: string,
  topY: number,
  height: number,
  amplitude: number,
  durationSec: number,
  phaseRad: number,
): void {
  const x = CANVAS_WIDTH / 2 + easedLoopOffset(amplitude, durationSec, phaseRad) - BOAT_SCENE_SURFACE_DRAW_W / 2;
  renderer.drawImage({ id: assetId }, x, topY, BOAT_SCENE_SURFACE_DRAW_W, height);
}

function getBoatRockDegrees(): number {
  return Math.sin((Date.now() / 1000 / 5.6) * Math.PI * 2 + 0.45) * 6;
}

function drawBoatSpriteGroup(renderer: GameRenderer, includeStandingDiver: boolean): void {
  const r = getBoatSpriteDrawRect();
  renderer.pushRotate(getBoatRockDegrees(), r.x + r.w / 2, r.y + r.h / 2);
  renderer.drawImage({ id: AssetIds.boatSceneBoat }, r.x, r.y, r.w, r.h);
  if (includeStandingDiver) {
    const diver = getBoatStandingDiverRect();
    renderer.drawImage({ id: AssetIds.diverStand }, diver.x, diver.y, diver.w, diver.h);
  }
  renderer.pop();
}

export function drawBoatBackgroundLayer(renderer: GameRenderer, alpha = 1, includeStandingDiver = false): void {
  if (alpha <= 0.002) return;
  if (alpha < 0.999) renderer.pushOpacity(alpha);

  const skyH = (CANVAS_WIDTH * BOAT_SCENE_SKY_NATURAL_H) / BOAT_SCENE_SKY_NATURAL_W;
  renderer.drawImage({ id: AssetIds.boatSceneSky }, 0, 0, CANVAS_WIDTH, skyH);
  drawSurfaceLayer(renderer, AssetIds.boatSceneSurface1, BOAT_SCENE_SURFACE_1_TOP_Y, BOAT_SCENE_SURFACE_1_DRAW_H, 300, 14.5, 0.35);
  drawSurfaceLayer(renderer, AssetIds.boatSceneSurface2, BOAT_SCENE_SURFACE_2_TOP_Y, BOAT_SCENE_SURFACE_2_DRAW_H, 450, 18.5, Math.PI + 0.9);
  drawBoatSpriteGroup(renderer, includeStandingDiver);
  drawSurfaceLayer(renderer, AssetIds.boatSceneSurface3, BOAT_SCENE_SURFACE_3_TOP_Y, BOAT_SCENE_SURFACE_3_DRAW_H, 390, 16.8, 2.35);
  drawSurfaceLayer(renderer, AssetIds.boatSceneSurface4, BOAT_SCENE_SURFACE_4_TOP_Y, BOAT_SCENE_SURFACE_4_DRAW_H, 340, 20.2, Math.PI * 1.45);
  drawSurfaceLayer(
    renderer,
    AssetIds.boatSceneSurface5,
    CANVAS_HEIGHT - BOAT_SCENE_SURFACE_5_DRAW_H,
    BOAT_SCENE_SURFACE_5_DRAW_H,
    280,
    23.5,
    Math.PI * 0.78,
  );

  if (alpha < 0.999) renderer.popOpacity();
}

export function drawBoatBackgroundOnly(renderer: GameRenderer): void {
  drawBoatBackgroundLayer(renderer);
}

export function getBoatStandingDiverRect(): { x: number; y: number; w: number; h: number } {
  const D = DIVE_TRANSITION;
  const boat = getBoatBackgroundDrawRect();
  const w = D.diverDrawWidth;
  const h = (w * D.diverStandNaturalH) / D.diverStandNaturalW;
  const anchorX = boat.x + D.diverDeckAnchor.xFrac * boat.w;
  const anchorY = boat.y + D.diverDeckAnchor.yFrac * boat.h;
  return {
    x: anchorX - w * 0.5,
    y: anchorY - h * D.diverStandFeetPivotY + BOAT_STANDING_DIVER_RENDER_OFFSET_Y,
    w,
    h,
  };
}

export function drawBoatStandingDiver(renderer: GameRenderer, alpha = 1): void {
  const r = getBoatStandingDiverRect();
  if (alpha >= 0.999) {
    renderer.drawImage({ id: AssetIds.diverStand }, r.x, r.y, r.w, r.h);
  } else if (alpha > 0.002) {
    renderer.drawImageAlpha({ id: AssetIds.diverStand }, r.x, r.y, r.w, r.h, alpha);
  }
}

export function drawBoatSceneLayer(renderer: GameRenderer, state: RenderState, alpha = 1): void {
  const d = state.diveTransition?.diver;
  drawBoatBackgroundLayer(renderer, alpha, d == null);
  if (d != null) {
    const id = d.pose === 'stand' ? AssetIds.diverStand : AssetIds.diverJump;
    if (alpha >= 0.999) {
      renderer.drawImage({ id }, d.x, d.y, d.drawW, d.drawH);
    } else if (alpha > 0.002) {
      renderer.drawImageAlpha({ id }, d.x, d.y, d.drawW, d.drawH, alpha * d.alpha);
    }
  }
}

/** Main-menu chrome (stats, upgrades, gear, go fish). */
export function drawBoatMenuUi(renderer: GameRenderer, state: RenderState): void {
  if (state.upgradePanelOpen !== null) {
    drawUpgradePanel(renderer, state, state.upgradePanelOpen);
    return;
  }

  const deck = getBoatContentColumn();
  const { contentX, bankW, ldW, ldX } = getBoatStatsColumnLayout();
  const padX = BOAT_CONTENT_TEXT_PAD_X;
  const STATS_Y = getBoatStatsCardTopY();
  const STATS_H = 86;
  const statsCardR = 14;
  const sectionPadY = BOAT_MENU_SECTION_CARD_PAD_Y;
  const secX = BOAT_SECTION_CONTENT_X;
  const secW = BOAT_SECTION_CONTENT_W;

  const firstU = getUpgradeButtonRect(0);
  const UPG_LABEL_Y = firstU.y - SECTION_HEADER_BLOCK_H - UPGRADE_SECTION_HEADER_GAP;

  // Stats — two side-by-side cards; column matches upgrades (`deck` = content column).
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, STATS_Y, bankW, STATS_H, statsCardR);
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, ldX, STATS_Y, ldW, STATS_H, statsCardR);

  const bankTextW = bankW - padX * 2;
  const ldTextW = ldW - padX * 2;
  renderer.drawText('BANK', contentX + padX, STATS_Y + 8, bankTextW, 20, t(14, Boat.labelMuted, 'left', '700'));
  renderer.drawText(`$${state.money}`, contentX + padX, STATS_Y + 32, bankTextW, 44, tb(32, Boat.menuAccent, 'left'));

  if (state.leaderboard.bestRunMoney > 0 || state.leaderboard.allTimeFishCaught > 0) {
    const colGap = 10;
    const bestW = Math.floor((ldTextW - colGap) / 2);
    const allTimeW = ldTextW - colGap - bestW;
    const leftX = ldX + padX;
    const rightX = leftX + bestW + colGap;
    const blockTop = STATS_Y + 10;
    const numberStyle = { useLayoutMaxWidth: false } as const;
    renderer.drawRectAlpha(Boat.labelMuted, 0.22, leftX + bestW + colGap / 2 - 1, STATS_Y + 16, 2, STATS_H - 32);
    renderer.drawText('BEST RUN', leftX, blockTop, bestW, 18, t(12, Boat.labelMuted, 'center', '700'));
    renderer.drawText(
      `${state.leaderboard.bestFishCaught}`,
      leftX,
      blockTop + 22,
      bestW,
      30,
      tb(28, C.white, 'center', numberStyle),
    );
    renderer.drawText('FISHES', leftX, blockTop + 52, bestW, 18, t(11, Boat.sectionMint, 'center', '800'));
    renderer.drawText('ALL-TIME', rightX, blockTop, allTimeW, 18, t(12, Boat.labelMuted, 'center', '700'));
    renderer.drawText(
      `${state.leaderboard.allTimeFishCaught}`,
      rightX,
      blockTop + 22,
      allTimeW,
      30,
      tb(28, C.gold, 'center', numberStyle),
    );
    renderer.drawText('FISHES', rightX, blockTop + 52, allTimeW, 18, t(11, Boat.sectionMint, 'center', '800'));
  } else {
    renderer.drawText('No stats yet', ldX + padX, STATS_Y + 36, ldTextW, 24, t(16, C.white, 'left', '600'));
    renderer.drawText('Tap GO FISH to start', ldX + padX, STATS_Y + 60, ldTextW, 20, t(14, Boat.labelMuted, 'left', '600'));
  }

  if (state.phase === GamePhase.Boat && !state.boatLeaderboardOpen) {
    drawBoatLeaderboardFab(renderer);
  }

  const diveCardPadY = sectionPadY + 4;
  const maxDiveShadowOffset = 10;
  const diveCardTop = DIVE_BUTTON_Y - diveCardPadY;
  const diveCardBottom = DIVE_BUTTON_Y + DIVE_BUTTON_HEIGHT + maxDiveShadowOffset + diveCardPadY;
  const diveCardH = diveCardBottom - diveCardTop;
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, diveCardTop, deck.w, diveCardH, 18);

  const diveInnerPad = BOAT_MENU_DIVE_BUTTON_INNER_PAD_X;
  const diveX = secX + diveInnerPad;
  const diveW = secW - diveInnerPad * 2;
  const loopPressed = state.phase === GamePhase.Boat && Math.floor(Date.now() / 520) % 2 === 0;
  const loopPressY = loopPressed ? 5 : 0;
  const menuUiA = state.diveTransition?.menuUiAlpha ?? 1;
  const pressP = state.phase === GamePhase.Diving ? Math.max(0.65, 1 - menuUiA) : 0;
  const pressY = Math.max(loopPressY, Math.min(7, Math.max(0, pressP * 7)));
  const shadowOffset = Math.max(2, 10 - pressY);
  renderer.drawRoundRect(Boat.diveShadow, diveX, DIVE_BUTTON_Y + shadowOffset, diveW, DIVE_BUTTON_HEIGHT, ROW_CARD_CORNER_R);
  renderer.drawRoundRectAlpha(Boat.diveHi, loopPressed ? 0.22 : 0.11, diveX - 4, DIVE_BUTTON_Y + pressY - 4, diveW + 8, DIVE_BUTTON_HEIGHT + 8, 16);
  renderer.drawRoundRect(Boat.dive, diveX, DIVE_BUTTON_Y + pressY, diveW, DIVE_BUTTON_HEIGHT, ROW_CARD_CORNER_R);
  drawDiveButtonTopEdge(renderer, diveX, DIVE_BUTTON_Y + pressY, diveW);
  const diveHiH = 18;
  const diveHiY = DIVE_BUTTON_Y + pressY + (DIVE_BUTTON_HEIGHT - diveHiH) / 2;
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.22, diveX + 3, diveHiY, diveW - 6, diveHiH, 10);
  renderer.drawText('GO FISH', diveX, DIVE_BUTTON_Y + pressY + DIVE_BUTTON_LABEL_Y_OFFSET, diveW, DIVE_BUTTON_HEIGHT, {
    ...t(32, Boat.card, 'center', '800'),
    useLayoutMaxWidth: false,
  });

  const upgradesCardTop = UPG_LABEL_Y - sectionPadY;
  const upgradesCardBottom = UPGRADE_LAST_ROW_BOTTOM + sectionPadY;
  const upgradesCardH = upgradesCardBottom - upgradesCardTop;
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, upgradesCardTop, deck.w, upgradesCardH, 18);

  drawSectionHeader(renderer, secX, UPG_LABEL_Y, secW, 'UPGRADES', Boat.menuAccent);

  for (let i = 0; i < UPGRADE_KEYS.length; i += 1) {
    const key = UPGRADE_KEYS[i];
    const rect = getUpgradeButtonRect(i);
    drawUpgradeButton(
      renderer,
      key,
      state.upgrades[key],
      state.upgradeCosts[key],
      state.canAfford[key],
      state.upgradePanelOpen === key,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
    );
  }
  if (state.ftuePrompt === 'upgradeHarpoon' && state.upgradePanelOpen === null) {
    const rect = getUpgradeButtonRect(0);
    const pulse = 0.68 + 0.32 * Math.sin(Date.now() / 180);
    renderer.drawRoundRectAlpha(C.gold, 0.20 + pulse * 0.18, rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12, 18);
    const press = (Date.now() % 380) / 380;
    const dip = (press < 0.16 ? press / 0.16 : 1 - (press - 0.16) / 0.84) * 9;
    const tipX = rect.x + 52;
    const tipY = rect.y + 42 + dip;
    const { w: hw, h: hh } = getFtueHandDrawSize(FTUE_HAND_MAX_SPAN_BOAT_PX);
    renderer.pushRotate(30, tipX, tipY);
    renderer.drawImage({ id: AssetIds.ftueHand }, tipX - 0.88 * hw, tipY - 0.5 * hh, hw, hh);
    renderer.pop();
  }

  const gearCardTop = GEAR_HEADER_LABEL_Y - sectionPadY;
  const gearCardBottom = CONSUMABLE_Y + CONSUMABLE_H + sectionPadY;
  const gearCardH = gearCardBottom - gearCardTop;
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, gearCardTop, deck.w, gearCardH, 18);

  drawSectionHeader(renderer, secX, GEAR_HEADER_LABEL_Y, secW, 'GEAR', Boat.menuAccent);

  const cx = secX;
  drawConsumableCard(
    renderer,
    'net',
    state.consumables.net,
    NET_MAX_STOCK,
    NET_COST,
    state.canAffordConsumables.net,
    cx,
    CONSUMABLE_Y,
    CONSUMABLE_W,
    CONSUMABLE_H,
  );
  drawConsumableCard(
    renderer,
    'bait',
    state.consumables.bait,
    BAIT_MAX_STOCK,
    BAIT_COST,
    state.canAffordConsumables.bait,
    cx + CONSUMABLE_W + CONSUMABLE_GAP,
    CONSUMABLE_Y,
    CONSUMABLE_W,
    CONSUMABLE_H,
  );

  if (state.boatLeaderboardOpen) {
    drawLeaderboardBoatModal(renderer, state);
  }
}

export function drawBoatScreen(renderer: GameRenderer, state: RenderState): void {
  drawBoatSceneLayer(renderer, state);
  drawBoatMenuUi(renderer, state);
}
