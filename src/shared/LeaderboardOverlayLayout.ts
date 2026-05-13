import { CANVAS_HEIGHT, CANVAS_WIDTH, getBoatStatsCardTopY } from '../core/Constants';

/** Matches former breach leaderboard card (`RenderFrame` / `leaderboardModal`). */
export const LEADERBOARD_MODAL_CARD_W = CANVAS_WIDTH - 72;
export const LEADERBOARD_MODAL_CARD_H = 490;
export const LEADERBOARD_MODAL_CARD_X = (CANVAS_WIDTH - LEADERBOARD_MODAL_CARD_W) / 2;
/** Vertically centered in the full-screen modal (scrim). */
export const LEADERBOARD_MODAL_CARD_Y = Math.round((CANVAS_HEIGHT - LEADERBOARD_MODAL_CARD_H) / 2);

const CLOSE_BTN_D = 44;
const CLOSE_BTN_INSET = 12;

export function getLeaderboardModalCloseButtonLayout(): { cx: number; cy: number; d: number } {
  const x = LEADERBOARD_MODAL_CARD_X;
  const y = LEADERBOARD_MODAL_CARD_Y;
  const w = LEADERBOARD_MODAL_CARD_W;
  const cx = x + w - CLOSE_BTN_INSET - CLOSE_BTN_D / 2;
  const cy = y + CLOSE_BTN_INSET + CLOSE_BTN_D / 2;
  return { cx, cy, d: CLOSE_BTN_D };
}

/** Bank / Last dive row height on the boat menu (must match `boatScreen` stats cards). */
export const BOAT_STATS_CARD_H = 86;
export const BOAT_LEADERBOARD_FAB_DIAM = 52;
export const BOAT_LEADERBOARD_FAB_MARGIN_X = 16;
export const BOAT_LEADERBOARD_FAB_GAP_BELOW_STATS = 10;

export function getBoatLeaderboardFabLayout(): { cx: number; cy: number; d: number } {
  const d = BOAT_LEADERBOARD_FAB_DIAM;
  const cx = CANVAS_WIDTH - BOAT_LEADERBOARD_FAB_MARGIN_X - d / 2;
  const cy = getBoatStatsCardTopY() + BOAT_STATS_CARD_H + BOAT_LEADERBOARD_FAB_GAP_BELOW_STATS + d / 2;
  return { cx, cy, d };
}

export function isBoatLeaderboardFabHit(lx: number, ly: number): boolean {
  const { cx, cy, d } = getBoatLeaderboardFabLayout();
  return Math.hypot(lx - cx, ly - cy) <= d / 2;
}

export function isLeaderboardModalCloseHit(lx: number, ly: number): boolean {
  const { cx, cy, d } = getLeaderboardModalCloseButtonLayout();
  return Math.hypot(lx - cx, ly - cy) <= d / 2 + 4;
}
