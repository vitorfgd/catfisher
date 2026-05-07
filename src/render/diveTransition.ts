/**
 * Renders the dive / breach wipe: masked boat vs underwater, optional diver, waterline VFX, overlays.
 * See `diveTransitionController.ts` for the mask/wipe explanation.
 */

import { AssetIds } from '../shared/AssetIds';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/Constants';
import { drawBoatBackgroundLayer, drawBoatMenuUi } from './boatScreen';
import { drawOceanTransition, type OceanTransitionDraw } from './oceanTransition';
import type { DiveTransitionDraw, DiveTransitionWaterline } from './RenderState';
import type { GameRenderer } from './GameRenderer';
import type { RenderState } from './RenderState';

/** Horizontal seam in screen space: boat-bg only for y < splitY, underwater only for y > splitY. */
function dualBackdropSplitY(waterline: DiveTransitionWaterline | null | undefined): number | null {
  if (waterline == null) return null;
  const y = waterline.parentY + waterline.surfaceDrawH * 0.5;
  return Math.max(0, Math.min(CANVAS_HEIGHT, y));
}

/** Masked boat vs underwater for the world pass (`drawUnderwaterPlayingField`). */
export function drawDiveMaskedBackdrops(renderer: GameRenderer, dive: DiveTransitionDraw): void {
  if (dive.backdrop == null) return;
  drawDualBackdrop(renderer, dive.backdrop, dive.waterline);
}

function drawDualBackdrop(
  renderer: GameRenderer,
  backdrop: { boat: number; underwater: number },
  waterline: DiveTransitionWaterline | null | undefined,
): void {
  const splitY = dualBackdropSplitY(waterline);
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  if (splitY == null) {
    if (backdrop.underwater > 0.002) {
      renderer.drawImageAlpha(
        { id: AssetIds.underwaterBg },
        0,
        0,
        W,
        H,
        backdrop.underwater,
      );
    }
    drawBoatBackgroundLayer(renderer, backdrop.boat);
    return;
  }

  const belowH = H - splitY;
  if (backdrop.underwater > 0.002 && belowH > 0.5) {
    renderer.pushClipRect(0, splitY, W, belowH);
    renderer.drawImageAlpha(
      { id: AssetIds.underwaterBg },
      0,
      0,
      W,
      H,
      backdrop.underwater,
    );
    renderer.popClip();
  }

  const aboveH = splitY;
  if (backdrop.boat > 0.002 && aboveH > 0.5) {
    renderer.pushClipRect(0, 0, W, aboveH);
    drawBoatBackgroundLayer(renderer, backdrop.boat);
    renderer.popClip();
  }
}

/**
 * Clipped boat / underwater wipe only (no base layer). Used during `Breaching` over the HUD
 * so the waterline reads correctly above chrome.
 */
export function drawDiveBackdropWipe(renderer: GameRenderer, dive: DiveTransitionDraw): void {
  if (dive.backdrop == null) return;
  drawDualBackdrop(renderer, dive.backdrop, dive.waterline);
}

function drawTransitionDiver(renderer: GameRenderer, dive: DiveTransitionDraw): void {
  if (dive.diver == null) return;
  const id = dive.diver.pose === 'stand' ? AssetIds.diverStand : AssetIds.diverJump;
  renderer.pushOpacity(dive.diver.alpha);
  renderer.drawImage({ id }, dive.diver.x, dive.diver.y, dive.diver.drawW, dive.diver.drawH);
  renderer.popOpacity();
}

function drawCameraBoatScene(renderer: GameRenderer, dive: DiveTransitionDraw): void {
  const camera = dive.camera;
  if (camera != null && Math.abs(camera.zoom - 1) > 0.001) {
    renderer.pushScale(camera.zoom, camera.zoom, camera.x, camera.y);
    drawBoatBackgroundLayer(renderer);
    drawTransitionDiver(renderer, dive);
    renderer.pop();
    return;
  }

  drawBoatBackgroundLayer(renderer);
  drawTransitionDiver(renderer, dive);
}

function drawUnderwaterReveal(renderer: GameRenderer, dive: DiveTransitionDraw): void {
  const backdrop = dive.backdrop;
  if (backdrop == null || backdrop.underwater <= 0.002) return;

  const splitY = dualBackdropSplitY(dive.waterline);
  if (splitY == null) {
    renderer.drawImageAlpha(
      { id: AssetIds.underwaterBg },
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      backdrop.underwater,
    );
    return;
  }

  const belowH = CANVAS_HEIGHT - splitY;
  if (belowH <= 0.5) return;
  renderer.pushClipRect(0, splitY, CANVAS_WIDTH, belowH);
  renderer.drawImageAlpha(
    { id: AssetIds.underwaterBg },
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    backdrop.underwater,
  );
  renderer.popClip();
}

/** Full `Diving` phase frame: boat, masked backdrops, menu, overlay diver, VFX, ocean crossfade. */
export function drawDiveTransitionFull(renderer: GameRenderer, state: RenderState): void {
  const dive = state.diveTransition;
  if (dive == null) return;

  drawCameraBoatScene(renderer, dive);

  if (dive.menuUiAlpha > 0.002) {
    renderer.pushOpacity(dive.menuUiAlpha);
    drawBoatMenuUi(renderer, state);
    renderer.popOpacity();
  }

  // Screen-space mask: the underwater background is drawn only from the waterline down,
  // so it covers the zoomed boat scene and falling bear like a video-editing wipe.
  drawUnderwaterReveal(renderer, dive);

  if (dive.waterline != null && dive.waterline.groupAlpha > 0.004) {
    const oceanDraw: OceanTransitionDraw = {
      parentY: dive.waterline.parentY,
      surfaceScrollX: dive.waterline.surfaceScrollX,
      surfaceDrawH: dive.waterline.surfaceDrawH,
      surfaceDrawW: dive.waterline.surfaceDrawW,
      groupAlpha: dive.waterline.groupAlpha,
      bubbles: dive.bubbles,
    };
    drawOceanTransition(renderer, oceanDraw);
  }

  if (dive.oceanOverlayAlpha > 0.002) {
    renderer.drawImageAlpha(
      { id: AssetIds.underwaterBg },
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      dive.oceanOverlayAlpha,
    );
  }
}

/** Waterline strip + bubbles during `Breaching` (drawn after world + HUD wipe when applicable). */
export function drawDiveWaterlineVfx(renderer: GameRenderer, dive: DiveTransitionDraw): void {
  if (dive.waterline == null || dive.waterline.groupAlpha < 0.004) return;
  const oceanDraw: OceanTransitionDraw = {
    parentY: dive.waterline.parentY,
    surfaceScrollX: dive.waterline.surfaceScrollX,
    surfaceDrawH: dive.waterline.surfaceDrawH,
    surfaceDrawW: dive.waterline.surfaceDrawW,
    groupAlpha: dive.waterline.groupAlpha,
    bubbles: dive.bubbles,
  };
  drawOceanTransition(renderer, oceanDraw);
}
