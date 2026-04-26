// Browser bootstrap. Owns canvas creation, asset loading, and adapter wiring.
// Do not import platform code from core/ or render/.

import { CANVAS_HEIGHT, CANVAS_WIDTH, GAME_ASPECT_RATIO } from './core/Constants';
import { createInitialState } from './core/GameLogic';
import { loadImages, BrowserAssetManifest } from './platform/AssetManifest';
import { BrowserAudioAdapter } from './platform/BrowserAudioAdapter';
import { BrowserGameLoop } from './platform/BrowserGameLoop';
import { BrowserInputAdapter } from './platform/BrowserInputAdapter';
import { Canvas2DRenderer } from './render/Canvas2DRenderer';
import { runConsistencyChecks } from './shared/ConsistencyChecks';

const container = document.getElementById('game-container');
if (!container) {
  throw new Error('Missing #game-container');
}

const canvas = document.createElement('canvas');
canvas.style.touchAction = 'none';
container.appendChild(canvas);

let ctx: CanvasRenderingContext2D | null = null;

function resizeCanvas(): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewAspect = viewportWidth / viewportHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (viewAspect > GAME_ASPECT_RATIO) {
    displayHeight = viewportHeight;
    displayWidth = viewportHeight * GAME_ASPECT_RATIO;
  } else {
    displayWidth = viewportWidth;
    displayHeight = viewportWidth / GAME_ASPECT_RATIO;
  }

  const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  canvas.width = Math.round(displayWidth * deviceScale);
  canvas.height = Math.round(displayHeight * deviceScale);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  if (ctx) {
    ctx.setTransform(canvas.width / CANVAS_WIDTH, 0, 0, canvas.height / CANVAS_HEIGHT, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

async function main(): Promise<void> {
  runConsistencyChecks();

  if ('fonts' in document) {
    await document.fonts.ready;
  }

  ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  resizeCanvas();
  ctx.imageSmoothingEnabled = false;

  const { images, missing } = await loadImages(BrowserAssetManifest);
  if (missing.length > 0) {
    console.warn(
      `[assets] Missing ${missing.length} image(s). Using fallback placeholders for: ${missing.join(', ')}`,
    );
  }

  const renderer = new Canvas2DRenderer(ctx, images, CANVAS_WIDTH, CANVAS_HEIGHT);
  const input = new BrowserInputAdapter(canvas);
  const audio = new BrowserAudioAdapter();
  const gameState = createInitialState();

  const loop = new BrowserGameLoop(gameState, renderer, input, audio);
  loop.start();
}

main().catch(console.error);
