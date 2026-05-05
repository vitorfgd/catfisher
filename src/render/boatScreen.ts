import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import type { UpgradeState } from '../core/Types';
import {
  BAIT_COST,
  BAIT_MAX_STOCK,
  BOAT_DECK_TOP_PAD,
  BOAT_SHELL_BELOW_DIVE,
  BOAT_CONTENT_TEXT_PAD_X,
  BOAT_SHELL_MAX_BOTTOM,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
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
  BOAT_TITLE_LOGO_TOP,
  BOAT_MENU_SCRIM_ALPHA,
  getBoatStatsCardTopY,
  getBoatTitleLogoDrawSize,
} from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import { getBoatShellHorizontal, getBoatStatsCardRect, getBoatStatsColumnLayout } from '../shared/BoatUiLayout';
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
  renderer.drawText(UPGRADE_SUBTEXT[id], infoX, y + 6, infoW, 38, subStyle);
  renderer.drawText(UPGRADE_LEVEL_NAMES[id][level - 1], infoX, y + 38, infoW, 28, t(19, nameC, 'left', '800'));

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
  renderer.drawText('← BACK', M, 0, 120, HDR_H, t(18, C.muted, 'left', '700'));
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
  renderer.drawText(CONSUMABLE_NAMES[id], infoX, y + 28, infoW, 36, t(20, nameC, 'left', '800', noFit));

  const pipY = y + 66;
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
  renderer.drawRectAlpha(Boat.cardLine, 0.5, x, y + H - 1, w, 1);
}

export function drawBoatBackgroundOnly(renderer: GameRenderer): void {
  renderer.drawImage({ id: AssetIds.boatBg }, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/** Main-menu chrome (stats, upgrades, dive, title). */
export function drawBoatMenuUi(renderer: GameRenderer, state: RenderState): void {
  if (state.upgradePanelOpen !== null) {
    drawUpgradePanel(renderer, state, state.upgradePanelOpen);
    return;
  }

  const { shellX, shellW } = getBoatShellHorizontal();
  const { contentX, contentW, bankW, ldW, ldX } = getBoatStatsColumnLayout();
  const padX = BOAT_CONTENT_TEXT_PAD_X;
  const titleSz = getBoatTitleLogoDrawSize();
  const STATS_Y = getBoatStatsCardTopY();
  const STATS_H = 86;
  const statsCard = getBoatStatsCardRect(STATS_Y, STATS_H);

  renderer.drawRectAlpha(C.bg, BOAT_MENU_SCRIM_ALPHA, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const firstU = getUpgradeButtonRect(0);
  const UPG_LABEL_Y = firstU.y - SECTION_HEADER_BLOCK_H - UPGRADE_SECTION_HEADER_GAP;
  /** Match section header + `BOAT_DECK_TOP_PAD` (was still using old −32 when headers grew). */
  const PANEL_Y = UPG_LABEL_Y - BOAT_DECK_TOP_PAD;
  // Shell must include DIVE + BOAT_SHELL_BELOW_DIVE; capping to CANVAS_HEIGHT-EDGE was stealing inner padding
  const diveBottom = DIVE_BUTTON_Y + DIVE_BUTTON_HEIGHT;
  const targetShellBottom = diveBottom + BOAT_SHELL_BELOW_DIVE;
  const shellBottom = Math.min(targetShellBottom, BOAT_SHELL_MAX_BOTTOM);
  const PANEL_H = shellBottom - PANEL_Y;

  renderer.drawRoundRectAlpha(Boat.shell, Boat.shellAlpha, shellX, PANEL_Y, shellW, PANEL_H, 22);
  renderer.drawRoundRectAlpha(Boat.shellRim, 0.4, shellX + 1, PANEL_Y + 1, shellW - 2, 3, 2);

  // Stats — same outer width as deck shell (upgrades sit in the inset column below)
  renderer.drawRoundRectAlpha(
    Boat.statsCard,
    Boat.statsAlpha,
    statsCard.shellX,
    statsCard.statsY,
    statsCard.shellW,
    statsCard.statsH,
    16,
  );
  renderer.drawRectAlpha(Boat.cardLine, 0.5, contentX + bankW, STATS_Y + 10, 1, STATS_H - 20);
  const bankTextW = bankW - padX * 2;
  const ldTextW = ldW - padX * 2;
  renderer.drawText('BANK', contentX + padX, STATS_Y + 8, bankTextW, 20, t(14, Boat.labelMuted, 'left', '700'));
  renderer.drawText(`$${state.money}`, contentX + padX, STATS_Y + 32, bankTextW, 44, tb(32, C.gold, 'left'));

  renderer.drawText('LAST DIVE', ldX + padX, STATS_Y + 8, ldTextW, 20, t(14, Boat.labelMuted, 'left', '700'));
  if (state.lastRunEarnings > 0) {
    const dur = Math.max(0, state.lastRunDurationSec);
    const durLabel = dur >= 60
      ? `${Math.floor(dur / 60)}m ${Math.floor(dur % 60)}s`
      : `${Math.floor(dur)}s`;
    renderer.drawText(`$${state.lastRunEarnings}`, ldX + padX, STATS_Y + 32, ldTextW, 30, tb(28, C.white, 'left'));
    renderer.drawText(
      `${state.lastRunCatchCount} fish · ${durLabel}`,
      ldX + padX,
      STATS_Y + 64,
      ldTextW,
      20,
      t(15, Boat.labelMuted, 'left', '600'),
    );
  } else {
    renderer.drawText('No run yet', ldX + padX, STATS_Y + 36, ldTextW, 24, t(16, Boat.labelMuted, 'left', '600'));
    renderer.drawText('Tap DIVE to start', ldX + padX, STATS_Y + 60, ldTextW, 20, t(14, Boat.sectionMint, 'left', '600'));
  }

  drawSectionHeader(renderer, contentX, UPG_LABEL_Y, contentW, 'UPGRADES', Boat.sectionMint);

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

  drawSectionHeader(renderer, contentX, GEAR_HEADER_LABEL_Y, contentW, 'GEAR', Boat.sectionSand);

  const cx = contentX;
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

  renderer.drawRoundRect(Boat.dive, contentX, DIVE_BUTTON_Y, contentW, DIVE_BUTTON_HEIGHT, 16);
  const diveHiH = 18;
  const diveHiY = DIVE_BUTTON_Y + (DIVE_BUTTON_HEIGHT - diveHiH) / 2;
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.18, contentX + 3, diveHiY, contentW - 6, diveHiH, 10);
  renderer.drawText('DIVE', contentX, DIVE_BUTTON_Y + DIVE_BUTTON_LABEL_Y_OFFSET, contentW, DIVE_BUTTON_HEIGHT, {
    ...tb(36, C.white, 'center'),
    useLayoutMaxWidth: false,
  });

  const titleX = (CANVAS_WIDTH - titleSz.drawW) / 2;
  renderer.drawImage({ id: AssetIds.titleLogo }, titleX, BOAT_TITLE_LOGO_TOP, titleSz.drawW, titleSz.drawH);
}

export function drawBoatScreen(renderer: GameRenderer, state: RenderState): void {
  drawBoatBackgroundOnly(renderer);
  drawBoatMenuUi(renderer, state);
}
