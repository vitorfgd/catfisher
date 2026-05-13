/**
 * Full-screen leaderboard modal (boat menu). Formerly part of the breach-out overlay.
 */

import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/Constants';
import {
  getLeaderboardModalCloseButtonLayout,
  LEADERBOARD_MODAL_CARD_H,
  LEADERBOARD_MODAL_CARD_W,
  LEADERBOARD_MODAL_CARD_X,
  LEADERBOARD_MODAL_CARD_Y,
} from '../shared/LeaderboardOverlayLayout';
import { AssetIds } from '../shared/AssetIds';
import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';
import { Boat, C, t, tb } from './theme';

const SPLASH_ART_ASPECT_WH = 790 / 547;
const SPLASH_ART_H = 160;

export function drawLeaderboardBoatModal(renderer: GameRenderer, state: RenderState): void {
  const w = LEADERBOARD_MODAL_CARD_W;
  const h = LEADERBOARD_MODAL_CARD_H;
  const x = LEADERBOARD_MODAL_CARD_X;
  const y = LEADERBOARD_MODAL_CARD_Y;

  renderer.drawRectAlpha(C.bg, 0.52, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  renderer.drawRoundRectAlpha(Boat.statsCard, Boat.statsAlpha, x, y, w, h, 22);

  const artW = SPLASH_ART_H * SPLASH_ART_ASPECT_WH;
  const artX = x + (w - artW) / 2;
  const artY = y + 16;
  renderer.drawImage({ id: AssetIds.leaderboardSplashArt }, artX, artY, artW, SPLASH_ART_H);

  const headerTop = artY + SPLASH_ART_H + 8;
  const headerH = 42;
  renderer.drawText('LEADERBOARD', x, headerTop, w, headerH, t(34, C.teal, 'center', '800'));

  const rowPitch = 42;
  const listY = headerTop + headerH + 6;
  const rows = state.leaderboard.entries
    .map((entry) => entry.isPlayer
      ? { ...entry, fishCaught: Math.max(entry.fishCaught, state.sessionCatchCount) }
      : entry)
    .sort((a, b) => b.fishCaught - a.fishCaught)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, 10);
  for (let i = 0; i < rows.length; i += 1) {
    const entry = rows[i]!;
    const rowY = listY + i * rowPitch;
    const isPlayer = entry.isPlayer;
    const rowW = w - 44;
    renderer.drawRoundRect(
      isPlayer ? Boat.pipEmpty : Boat.rowCard,
      x + 22,
      rowY,
      rowW,
      34,
      11,
    );
    renderer.drawText(`#${entry.rank}`, x + 36, rowY + 4, 48, 26, tb(16, isPlayer ? Boat.dive : C.muted, 'left'));
    renderer.drawText(
      entry.name,
      x + 92,
      rowY + 4,
      170,
      26,
      t(17, C.white, 'left', '800'),
    );
    renderer.drawText(`${entry.fishCaught}`, x + w - 94, rowY + 4, 58, 26, tb(18, isPlayer ? Boat.dive : C.white, 'right'));
  }

  const { cx, cy, d } = getLeaderboardModalCloseButtonLayout();
  const corner = d * 0.5;
  const shadowOff = 3;
  renderer.drawRoundRect(Boat.diveShadow, cx - d / 2, cy - d / 2 + shadowOff, d, d, corner);
  renderer.drawRoundRect(Boat.dive, cx - d / 2, cy - d / 2, d, d, corner);
  renderer.drawRoundRectAlpha(Boat.diveHi, 0.15, cx - d / 2 + 2, cy - d / 2 + 2, d - 4, (d - 4) * 0.35, corner * 0.5);
  renderer.drawText('×', cx - d / 2, cy - d / 2, d, d, {
    ...t(28, Boat.card, 'center', '800'),
    useLayoutMaxWidth: false,
  });
}
