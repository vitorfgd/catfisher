import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import type { UpgradeState } from '../core/Types';
import {
  BAIT_COST,
  BAIT_MAX_STOCK,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CONSUMABLE_GAP,
  CONSUMABLE_H,
  CONSUMABLE_W,
  CONSUMABLE_Y,
  DIVE_BUTTON_HEIGHT,
  DIVE_BUTTON_Y,
  NET_COST,
  NET_MAX_STOCK,
  UPGRADE_MARGIN,
  UPGRADE_MAX_LEVEL,
  UPGRADE_PANEL_BUY_H,
  UPGRADE_PANEL_BUY_Y,
} from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import { getUpgradeButtonRect, UPGRADE_KEYS } from '../shared/UiLayout';
import { C, t, tb, td } from './theme';
import {
  getUpgradeStatLines,
  UPGRADE_LABELS,
  UPGRADE_LEVEL_NAMES,
  UPGRADE_LEVEL_SPRITES,
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
  const nameC = dim ? C.muted : C.white;

  renderer.drawRoundRectAlpha(C.bg, 0.94, x, y, width, height, 12);
  if (isOpen) renderer.drawRoundRectAlpha(C.teal, 0.10, x, y, width, height, 12);

  const iconZone = height;
  const iconPad = 7;
  const iconSz = iconZone - iconPad * 2;
  const sprite = UPGRADE_LEVEL_SPRITES[id][level - 1];
  renderer.drawRoundRectAlpha(accent, dim ? 0.10 : 0.18, x + 2, y + 2, iconZone - 4, height - 4, 10);
  renderer.drawImage({ id: sprite }, x + iconPad, y + iconPad, iconSz, iconSz);

  renderer.drawRectAlpha(C.border, 0.9, x + iconZone + 2, y + 8, 1, height - 16);

  const infoX = x + iconZone + 14;
  const infoW = width - iconZone - 80;
  renderer.drawText(UPGRADE_LABELS[id], infoX, y + 9, infoW, 18, t(12, C.muted, 'left', '600'));
  renderer.drawText(UPGRADE_LEVEL_NAMES[id][level - 1], infoX, y + 26, infoW, 26, t(17, nameC, 'left', '800'));

  for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) {
    renderer.drawEllipse(i < level ? accent : C.border, infoX + 2 + i * 14, y + 62, 5, 5);
  }

  const costLabel = maxed ? 'MAX' : `$${cost}`;
  const costColor = maxed ? C.gold : canAfford ? C.teal : C.muted;
  renderer.drawText(costLabel, x + width - 56, y + 28, 50, 28, tb(17, costColor, 'right'));
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

  renderer.drawRectAlpha(C.bg, 0.92, 0, 0, W, H);

  const HDR_H = 80;
  renderer.drawRectAlpha(C.bg, 0.97, 0, 0, W, HDR_H);
  renderer.drawRectAlpha(accent, 0.40, 0, HDR_H - 2, W, 2);
  renderer.drawText('← BACK', M, 0, 120, HDR_H, t(18, C.muted, 'left', '700'));
  renderer.drawText(UPGRADE_LABELS[id], 0, 0, W, HDR_H, tb(28, C.white, 'center'));

  const curName = UPGRADE_LEVEL_NAMES[id][level - 1];
  renderer.drawText(`Level ${level}  ·  ${curName}`, 0, HDR_H + 12, W, 28, t(18, C.muted, 'center'));
  const pipStartX = W / 2 - (UPGRADE_MAX_LEVEL * 16) / 2 + 8;
  for (let i = 0; i < UPGRADE_MAX_LEVEL; i += 1) {
    renderer.drawEllipse(i < level ? accent : C.border, pipStartX + i * 16, HDR_H + 52, 6, 6);
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
  const nameC = canAfford || stocked ? C.white : C.muted;
  const costC = stocked ? C.gold : canAfford ? C.amber : C.muted;

  renderer.drawRoundRectAlpha(C.bg, 0.94, x, y, width, height, 12);
  renderer.drawRoundRectAlpha(C.amber, 0.07, x, y, width, height, 12);

  const iconAreaSz = height;
  const iconPad = 4;
  const iconSz = iconAreaSz - iconPad * 2;
  renderer.drawRoundRectAlpha(accent, 0.20, x + 2, y + 2, iconAreaSz - 4, height - 4, 10);
  renderer.drawImage({ id: CONSUMABLE_ICON_IDS[id] }, x + iconPad, y + iconPad, iconSz, iconSz);
  renderer.drawRectAlpha(C.border, 0.9, x + iconAreaSz + 2, y + 6, 1, height - 12);

  const infoX = x + iconAreaSz + 8;
  const infoW = width - iconAreaSz - 16;
  const label = id === 'net' ? 'DRIFT NET' : 'LURE BAIT';
  const desc = id === 'net' ? 'catch all fish' : 'attract fish';

  renderer.drawText(label, infoX, y + 6, infoW, 24, t(16, nameC, 'left', '800'));
  renderer.drawText(desc, infoX, y + 30, infoW, 20, t(13, C.muted, 'left'));

  for (let i = 0; i < maxStock; i += 1) {
    renderer.drawEllipse(i < stock ? accent : C.border, infoX + 4 + i * 14, y + 57, 5, 5);
  }

  renderer.drawText(stocked ? 'FULL' : `$${cost}`, x + width - 52, y + 46, 48, 22, tb(15, costC, 'right'));
}

export function drawBoatScreen(renderer: GameRenderer, state: RenderState): void {
  const M = UPGRADE_MARGIN;
  renderer.drawImage({ id: AssetIds.boatBg }, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (state.upgradePanelOpen !== null) {
    drawUpgradePanel(renderer, state, state.upgradePanelOpen);
    return;
  }

  const PANEL_Y = getUpgradeButtonRect(0).y - 42;
  const PANEL_H = CANVAS_HEIGHT - PANEL_Y - 6;
  renderer.drawRoundRectAlpha(C.bg, 0.82, M - 16, PANEL_Y, CANVAS_WIDTH - (M - 16) * 2, PANEL_H, 18);

  renderer.drawText('FISHERCAT', 0, 14, CANVAS_WIDTH, 78, td(56, C.white, 'center'));

  const STATS_Y = 88;
  const STATS_H = 66;
  const bankW = 150;
  const ldW = CANVAS_WIDTH - M * 2 - bankW - 10;
  const ldX = M + bankW + 10;
  renderer.drawRoundRectAlpha(C.bg, 0.92, M, STATS_Y, bankW, STATS_H, 12);
  renderer.drawText('BANK', M + 12, STATS_Y + 6, bankW - 24, 18, t(12, C.muted, 'left'));
  renderer.drawText(`$${state.money}`, M + 12, STATS_Y + 24, bankW - 24, 36, tb(30, C.gold, 'left'));

  renderer.drawRoundRectAlpha(C.bg, 0.92, ldX, STATS_Y, ldW, STATS_H, 12);
  renderer.drawText('LAST DIVE', ldX + 12, STATS_Y + 6, ldW, 18, t(12, C.muted, 'left'));
  if (state.lastRunEarnings > 0) {
    const dur = Math.max(0, state.lastRunDurationSec);
    const durLabel = dur >= 60
      ? `${Math.floor(dur / 60)}m ${Math.floor(dur % 60)}s`
      : `${Math.floor(dur)}s`;
    renderer.drawText(`$${state.lastRunEarnings}`, ldX + 12, STATS_Y + 24, ldW - 80, 36, tb(26, C.white, 'left'));
    renderer.drawText(
      `${state.lastRunCatchCount} fish  ·  ${durLabel}`,
      ldX + ldW - 200,
      STATS_Y + 24,
      200,
      36,
      t(15, C.muted, 'right'),
    );
  } else {
    renderer.drawText('No dives yet', ldX + 12, STATS_Y + 24, ldW - 24, 36, t(15, C.muted, 'left'));
  }

  const UPG_LABEL_Y = getUpgradeButtonRect(0).y - 20;
  renderer.drawText('UPGRADES', M, UPG_LABEL_Y, 160, 18, t(14, C.teal, 'left', '700'));
  renderer.drawRectAlpha(C.teal, 0.22, M, UPG_LABEL_Y + 16, CANVAS_WIDTH - M * 2, 1);

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

  const CON_LABEL_Y = CONSUMABLE_Y - 20;
  renderer.drawText('CONSUMABLES', M, CON_LABEL_Y, 200, 18, t(14, C.amber, 'left', '700'));
  renderer.drawRectAlpha(C.amber, 0.22, M, CON_LABEL_Y + 16, CANVAS_WIDTH - M * 2, 1);

  drawConsumableCard(
    renderer,
    'net',
    state.consumables.net,
    NET_MAX_STOCK,
    NET_COST,
    state.canAffordConsumables.net,
    M,
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
    M + CONSUMABLE_W + CONSUMABLE_GAP,
    CONSUMABLE_Y,
    CONSUMABLE_W,
    CONSUMABLE_H,
  );

  renderer.drawRoundRect(C.teal, M, DIVE_BUTTON_Y, CANVAS_WIDTH - M * 2, DIVE_BUTTON_HEIGHT, 14);
  renderer.drawRoundRectAlpha('#ffffff', 0.12, M + 4, DIVE_BUTTON_Y + 2, CANVAS_WIDTH - M * 2 - 8, 12, 10);
  renderer.drawText('DIVE', M, DIVE_BUTTON_Y, CANVAS_WIDTH - M * 2, DIVE_BUTTON_HEIGHT, tb(32, C.white, 'center'));
}
