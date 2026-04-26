import {
  BOAT_SHEET_PAD,
  CANVAS_WIDTH,
  CONSUMABLE_GAP,
  CONSUMABLE_H,
  CONSUMABLE_W,
  CONSUMABLE_Y,
  DIVE_BUTTON_HEIGHT,
  DIVE_BUTTON_Y,
  UPGRADE_BUTTON_GAP,
  UPGRADE_BUTTON_H,
  UPGRADE_BUTTON_W,
  UPGRADE_BUTTONS_TOP,
  UPGRADE_MARGIN,
  UPGRADE_PANEL_BUY_H,
  UPGRADE_PANEL_BUY_Y,
} from '../core/Constants';
import type { UpgradeState } from '../core/Types';

export const UPGRADE_KEYS = ['speargun', 'haul', 'oxygen'] as const;
export const HUD_CONSUMABLE_BUTTON_RADIUS = 27;
export const HUD_CONSUMABLE_BUTTON_HIT_RADIUS = 33;
export const HUD_CONSUMABLE_BUTTON_Y = 97;
export const HUD_BAIT_BUTTON_CX = CANVAS_WIDTH - 37;
export const HUD_NET_BUTTON_CX = CANVAS_WIDTH - 99;

export function getUpgradeButtonRect(index: number): { x: number; y: number; w: number; h: number } {
  return {
    x: UPGRADE_MARGIN + BOAT_SHEET_PAD,
    y: UPGRADE_BUTTONS_TOP + index * (UPGRADE_BUTTON_H + UPGRADE_BUTTON_GAP),
    w: UPGRADE_BUTTON_W,
    h: UPGRADE_BUTTON_H,
  };
}

export function getUpgradeKeyByPoint(lx: number, ly: number): keyof UpgradeState | null {
  for (let i = 0; i < UPGRADE_KEYS.length; i += 1) {
    const { x, y, w, h } = getUpgradeButtonRect(i);
    if (lx >= x && lx <= x + w && ly >= y && ly <= y + h) return UPGRADE_KEYS[i];
  }
  return null;
}

export function isUpgradePanelBuyButton(lx: number, ly: number): boolean {
  return (
    lx >= UPGRADE_MARGIN &&
    lx <= CANVAS_WIDTH - UPGRADE_MARGIN &&
    ly >= UPGRADE_PANEL_BUY_Y &&
    ly <= UPGRADE_PANEL_BUY_Y + UPGRADE_PANEL_BUY_H
  );
}

export function isDiveButton(lx: number, ly: number): boolean {
  const x = UPGRADE_MARGIN + BOAT_SHEET_PAD;
  return (
    lx >= x
    && lx <= x + UPGRADE_BUTTON_W
    && ly >= DIVE_BUTTON_Y
    && ly <= DIVE_BUTTON_Y + DIVE_BUTTON_HEIGHT
  );
}

export function getBoatConsumableBuyHit(lx: number, ly: number): 'net' | 'bait' | null {
  const netX = UPGRADE_MARGIN + BOAT_SHEET_PAD;
  const baitX = netX + CONSUMABLE_W + CONSUMABLE_GAP;
  if (ly < CONSUMABLE_Y || ly > CONSUMABLE_Y + CONSUMABLE_H) return null;
  if (lx >= netX && lx <= netX + CONSUMABLE_W) return 'net';
  if (lx >= baitX && lx <= baitX + CONSUMABLE_W) return 'bait';
  return null;
}

export function getHudConsumableUseHit(lx: number, ly: number): 'net' | 'bait' | null {
  if (Math.hypot(lx - HUD_BAIT_BUTTON_CX, ly - HUD_CONSUMABLE_BUTTON_Y) <= HUD_CONSUMABLE_BUTTON_HIT_RADIUS) return 'bait';
  if (Math.hypot(lx - HUD_NET_BUTTON_CX, ly - HUD_CONSUMABLE_BUTTON_Y) <= HUD_CONSUMABLE_BUTTON_HIT_RADIUS) return 'net';
  return null;
}
