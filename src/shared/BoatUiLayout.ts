/**
 * Boat menu layout: wide `BOAT_SHELL_*` deck + inset `BOAT_CONTENT_*` column (stats, upgrades, gear, DIVE).
 */

import { BOAT_CONTENT_W, BOAT_CONTENT_X, BOAT_SHELL_W, BOAT_SHELL_X } from '../core/Constants';

export const BOAT_STATS_COLUMN_GAP_PX = 10;

export function getBoatShellHorizontal(): { shellX: number; shellW: number } {
  return { shellX: BOAT_SHELL_X, shellW: BOAT_SHELL_W };
}

export function getBoatContentColumn(): { x: number; w: number } {
  return { x: BOAT_CONTENT_X, w: BOAT_CONTENT_W };
}

/** Equal Bank / Last-dive columns inside the content width. */
export function getBoatStatsColumnLayout(gapPx = BOAT_STATS_COLUMN_GAP_PX): {
  contentX: number;
  contentW: number;
  bankW: number;
  ldW: number;
  ldX: number;
} {
  const contentX = BOAT_CONTENT_X;
  const contentW = BOAT_CONTENT_W;
  const bankW = Math.floor((contentW - gapPx) / 2);
  const ldW = contentW - gapPx - bankW;
  const ldX = contentX + bankW + gapPx;
  return { contentX, contentW, bankW, ldW, ldX };
}
