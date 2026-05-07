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
  BOAT_MENU_SCRIM_ALPHA,
  getBoatStatsCardTopY,
} from '../core/Constants';
import { DIVE_TRANSITION } from '../core/diveTransitionConfig';
import { AssetIds } from '../shared/AssetIds';
import { getBoatContentColumn, getBoatStatsColumnLayout } from '../shared/BoatUiLayout';
import { getUpgradeButtonRect, UPGRADE_KEYS } from '../shared/UiLayout';
import { Boat, C, t, tb } from './theme';
import {
  CONSUMABLE_NAMES,
  getUpgradeStatLines,
  UPGRADE_LABELS,
  UPGRADE_LEVEL_NAMES,
  UPGRADE_LEVEL_SPRITES,
  UPGRADE_SUBTEXT,
} from './upgradePresentation';

const CONSUMABLE_ICON_IDS: Record<'net' | 'bait', string> = {
  net: AssetIds.iconNet,
  bait: AssetIds.iconBait,
};

function drawUpgradeButton(
  renderer: GameRenderer,
  id: keyof UpgradeState,
  level: number,
  cost: number,
  canAfford: boolean,
  isOpen: boolean,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const maxed = level >= UPGRADE_MAX_LEVEL;
  const accent = maxed ? C.gold : C.teal;
  const dim = !canAfford && !maxed && !isOpen;
  const nameC = dim ? Boat.labelMuted : Boat.labelBright;

  renderer.drawRoundRectAlpha(Boat.card, 0.98, x, y, width, height, 14);
  if (isOpen) renderer.drawRoundRectAlpha(Boat.cardOpen, 0.9, x, y, width, height, 14);
  if (!isOpen) renderer.drawRoundRectAlpha(C.teal, 0.06, x + 1, y + 1, width - 2, height - 2, 13);

  const iconZone = height;
  const iconPad = 8;
  const iconSz = iconZone - iconPad * 2;
  const sprite = UPGRADE_LEVEL_SPRITES[id][level - 1];
  renderer.drawRoundRectAlpha(accent, dim ? 0.10 : 0.22, x + 2, y + 2, iconZone - 4, height - 4, 12);
  renderer.drawImage({ id: sprite }, x + iconPad, y + iconPad, iconSz, iconSz);

  const infoX = x + iconZone + 12;
  const infoW = width - iconZone - 96;
  const subStyle = { ...t(14, Boat.labelMuted, 'left', '500'), useLayoutMaxWidth: false } as const;
  renderer.drawText(UPGRADE_LEVEL_NAMES[id][level - 1], infoX, y + 6, infoW, 28, t(19, nameC, 'left', '800'));
  renderer.drawText(UPGRADE_SUBTEXT[id], infoX, y + 28, infoW, 38, subStyle);

  const pipY = y + 72;
  const pipR = 6;
  const pip0 = infoX + pipR;
  const pipGap = 16;
  for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) {
    const cx = pip0 + i * pipGap;
    renderer.drawEllipse(i < level ? accent : Boat.pipEmpty, cx, pipY, pipR, pipR);
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
    renderer.drawEllipse(i < level ? accent : Boat.pipEmpty, pipStartX + i * 16, HDR_H + 52, 6, 6);
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
    renderer.drawRoundRectAlpha(accent, 0.18, sprX - 10, sprY - 10, SZ + 20, SZ + 20, 16);
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
    renderer.drawRoundRectAlpha(C.gold, 0.22, sprX - 10, sprY - 10, SZ + 20, SZ + 20, 16);
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
      renderer.drawRoundRect(accent, M, bbY, W - M * 2, bbH, 14);
      renderer.drawRoundRectAlpha('#fff', 0.10, M + 4, bbY + 3, W - M * 2 - 8, 18, 10);
      renderer.drawText(`UPGRADE  $${cost}`, M, bbY, W - M * 2, bbH, tb(26, C.white, 'center'));
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
  const accent = stocked ? C.gold : canAfford ? C.amber : C.muted;
  const nameC = canAfford || stocked ? Boat.labelBright : Boat.labelMuted;
  const costC = stocked ? C.gold : canAfford ? C.amber : C.muted;

  renderer.drawRoundRectAlpha(Boat.card, 0.98, x, y, width, height, 14);
  renderer.drawRoundRectAlpha(Boat.gearTint, 0.55, x, y, width, height, 14);
  renderer.drawRoundRectAlpha(C.amber, canAfford || stocked ? 0.10 : 0.04, x, y, width, height, 14);

  const iconAreaSz = height;
  const iconPad = 8;
  const iconSz = iconAreaSz - iconPad * 2;
  renderer.drawRoundRectAlpha(accent, 0.24, x + 2, y + 2, iconAreaSz - 4, height - 4, 12);
  renderer.drawImage({ id: CONSUMABLE_ICON_IDS[id] }, x + iconPad, y + iconPad, iconSz, iconSz);

  const infoX = x + iconAreaSz + 12;
  const infoW = width - (infoX - x) - 72;
  const noFit = { useLayoutMaxWidth: false } as const;
  renderer.drawText(CONSUMABLE_NAMES[id], infoX, y + 18, infoW, 36, t(20, nameC, 'left', '800', noFit));

  const pipY = y + 60;
  const pipR = 6;
  const pip0 = infoX + pipR;
  const pipGap = 16;
  for (let i = 0; i < maxStock; i += 1) {
    const cx = pip0 + i * pipGap;
    renderer.drawEllipse(i < stock ? accent : Boat.pipEmpty, cx, pipY, pipR, pipR);
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

export function drawBoatBackgroundLayer(renderer: GameRenderer, alpha = 1): void {
  const { x, y, w, h } = getBoatBackgroundDrawRect();
  if (alpha >= 0.999) {
    renderer.drawImage({ id: AssetIds.boatBg }, x, y, w, h);
  } else if (alpha > 0.002) {
    renderer.drawImageAlpha({ id: AssetIds.boatBg }, x, y, w, h, alpha);
  }
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
    y: anchorY - h * D.diverStandFeetPivotY,
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

export function drawBoatSceneLayer(renderer: GameRenderer, alpha = 1): void {
  drawBoatBackgroundLayer(renderer, alpha);
  drawBoatStandingDiver(renderer, alpha);
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

  renderer.drawRectAlpha(C.bg, BOAT_MENU_SCRIM_ALPHA, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const firstU = getUpgradeButtonRect(0);
  const UPG_LABEL_Y = firstU.y - SECTION_HEADER_BLOCK_H - UPGRADE_SECTION_HEADER_GAP;

  // Stats — two side-by-side cards; column matches upgrades (`deck` = content column).
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, STATS_Y, bankW, STATS_H, statsCardR);
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, ldX, STATS_Y, ldW, STATS_H, statsCardR);

  const bankTextW = bankW - padX * 2;
  const ldTextW = ldW - padX * 2;
  renderer.drawText('BANK', contentX + padX, STATS_Y + 8, bankTextW, 20, t(14, Boat.labelMuted, 'left', '700'));
  renderer.drawText(`$${state.money}`, contentX + padX, STATS_Y + 32, bankTextW, 44, tb(32, C.gold, 'left'));

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
    renderer.drawText('No stats yet', ldX + padX, STATS_Y + 36, ldTextW, 24, t(16, Boat.labelMuted, 'left', '600'));
    renderer.drawText('Tap GO FISH to start', ldX + padX, STATS_Y + 60, ldTextW, 20, t(14, Boat.sectionMint, 'left', '600'));
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
  renderer.drawRoundRectAlpha('rgba(64,220,170,0.36)', 1, diveX, DIVE_BUTTON_Y + shadowOffset, diveW, DIVE_BUTTON_HEIGHT, 14);
  renderer.drawRoundRectAlpha('rgba(2,6,10,0.40)', 1, diveX, DIVE_BUTTON_Y + shadowOffset + 2, diveW, DIVE_BUTTON_HEIGHT, 14);
  renderer.drawRoundRectAlpha(Boat.diveHi, loopPressed ? 0.18 : 0.08, diveX - 4, DIVE_BUTTON_Y + pressY - 4, diveW + 8, DIVE_BUTTON_HEIGHT + 8, 16);
  renderer.drawRoundRect(Boat.dive, diveX, DIVE_BUTTON_Y + pressY, diveW, DIVE_BUTTON_HEIGHT, 14);
  const diveHiH = 18;
  const diveHiY = DIVE_BUTTON_Y + pressY + (DIVE_BUTTON_HEIGHT - diveHiH) / 2;
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.18, diveX + 3, diveHiY, diveW - 6, diveHiH, 10);
  renderer.drawText('GO FISH', diveX, DIVE_BUTTON_Y + pressY + DIVE_BUTTON_LABEL_Y_OFFSET, diveW, DIVE_BUTTON_HEIGHT, {
    ...t(32, Boat.card, 'center', '800'),
    useLayoutMaxWidth: false,
  });

  const upgradesCardTop = UPG_LABEL_Y - sectionPadY;
  const upgradesCardBottom = UPGRADE_LAST_ROW_BOTTOM + sectionPadY;
  const upgradesCardH = upgradesCardBottom - upgradesCardTop;
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, upgradesCardTop, deck.w, upgradesCardH, 18);

  drawSectionHeader(renderer, secX, UPG_LABEL_Y, secW, 'UPGRADES', Boat.sectionMint);

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
    const handPx = 60;
    renderer.pushRotate(30, tipX, tipY);
    renderer.drawImage({ id: AssetIds.ftueHand }, tipX - 0.88 * handPx, tipY - 0.5 * handPx, handPx, handPx);
    renderer.pop();
  }

  const gearCardTop = GEAR_HEADER_LABEL_Y - sectionPadY;
  const gearCardBottom = CONSUMABLE_Y + CONSUMABLE_H + sectionPadY;
  const gearCardH = gearCardBottom - gearCardTop;
  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, deck.x, gearCardTop, deck.w, gearCardH, 18);

  drawSectionHeader(renderer, secX, GEAR_HEADER_LABEL_Y, secW, 'GEAR', Boat.sectionSand);

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

}

export function drawBoatScreen(renderer: GameRenderer, state: RenderState): void {
  drawBoatSceneLayer(renderer);
  drawBoatMenuUi(renderer, state);
}
