// Ocean dive / breach VFX (water surface scroll, gradient, bubble sheet).
// Uses logical canvas coordinates; caller clears the frame.

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  OCEAN_SURFACE_DRAW_H,
  OCEAN_SURFACE_NATURAL_H,
  OCEAN_SURFACE_NATURAL_W,
} from '../core/Constants';
import { AssetIds } from '../shared/AssetIds';
import type { GameRenderer } from './GameRenderer';

/** Source rects for `vfx-bubble-sheet.png` (196×155). */
export const BUBBLE_VARIANT_FRAMES: ReadonlyArray<{ sx: number; sy: number; sw: number; sh: number }> = [
  { sx: 1, sy: 1, sw: 62, sh: 72 },
  { sx: 65, sy: 1, sw: 62, sh: 72 },
  { sx: 129, sy: 1, sw: 66, sh: 72 },
  { sx: 0, sy: 78, sw: 49, sh: 76 },
  { sx: 51, sy: 78, sw: 48, sh: 76 },
  { sx: 101, sy: 78, sw: 48, sh: 76 },
  { sx: 151, sy: 78, sw: 44, sh: 76 },
];

export interface OceanTransitionDraw {
  parentY: number;
  surfaceScrollX: number;
  surfaceDrawH: number;
  surfaceDrawW: number;
  groupAlpha: number;
  bubbles: ReadonlyArray<{ variant: number; lx: number; ly: number; alpha: number }>;
}

export function getOceanSurfaceLayout(): {
  surfaceDrawH: number;
  surfaceDrawW: number;
  scrollRange: number;
} {
  const surfaceDrawH = OCEAN_SURFACE_DRAW_H;
  const surfaceDrawW = (OCEAN_SURFACE_NATURAL_W / OCEAN_SURFACE_NATURAL_H) * surfaceDrawH;
  const scrollRange = Math.max(0, surfaceDrawW - CANVAS_WIDTH);
  return { surfaceDrawH, surfaceDrawW, scrollRange };
}

const BUBBLE_DRAW_SCALE = 0.72;

export function drawOceanTransition(renderer: GameRenderer, p: OceanTransitionDraw): void {
  if (p.groupAlpha < 0.004) return;

  const clampY = p.surfaceDrawH * 0.5;
  const gradH = CANVAS_HEIGHT * 2 + 120;

  renderer.pushOpacity(p.groupAlpha);
  renderer.pushTranslate(0, p.parentY);

  renderer.drawImage(
    { id: AssetIds.vfxWaterGradient },
    0,
    clampY,
    CANVAS_WIDTH,
    gradH,
  );

  const sheet = { id: AssetIds.vfxBubbleSheet };
  for (const b of p.bubbles) {
    const fr = BUBBLE_VARIANT_FRAMES[b.variant % BUBBLE_VARIANT_FRAMES.length]!;
    const dw = fr.sw * BUBBLE_DRAW_SCALE;
    const dh = fr.sh * BUBBLE_DRAW_SCALE;
    renderer.drawImageRegionAlpha(
      sheet,
      fr.sx,
      fr.sy,
      fr.sw,
      fr.sh,
      b.lx - dw / 2,
      b.ly - dh / 2,
      dw,
      dh,
      b.alpha,
    );
  }

  renderer.drawImage(
    { id: AssetIds.vfxWaterSurface },
    p.surfaceScrollX,
    0,
    p.surfaceDrawW,
    p.surfaceDrawH,
  );

  renderer.pop();
  renderer.pop();
}
