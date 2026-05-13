/**
 * Boat ↔ ocean wipe transition: timing, easing, bubble simulation, and render snapshot.
 *
 * ## Mask / wipe logic (Menu → Game)
 * The moving waterline object (`parentY`) positions a horizontal strip (`vfxWaterSurface`).
 * The seam `splitY = parentY + surfaceDrawH * 0.5` divides the screen:
 * - **Above** `splitY`: clip rect → draw boat background (what the player still “sees” of the boat world).
 * - **Below** `splitY`: clip rect → draw underwater background (the ocean “wipe” reveals this region
 *   as the seam travels upward — same idea as a video-editing wipe with an animated edge).
 * The strip + vertical gradient + bubbles draw on top for juice.
 *
 * Game → Menu inverts parent motion (seam moves downward) and mirrors the diver jump onto the deck
 * during `breachBoatRevealDuration`.
 */

import type { DiveTransitionDraw } from '../render/RenderState';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getBoatBackgroundDrawRect,
  OCEAN_BUBBLE_FADE_IN_SEC,
  OCEAN_BUBBLE_RISE_SPEED,
  OCEAN_SURFACE_DRAW_H,
  OCEAN_SURFACE_NATURAL_H,
  OCEAN_SURFACE_NATURAL_W,
} from './Constants';
import {
  DIVE_TRANSITION,
  GAME_TO_MENU_BREACH_TOTAL_SEC,
  GO_FISH_SPLASH_DELAY_MS,
  getMenuToGameDiveSegmentEnds,
} from './diveTransitionConfig';

const GO_FISH_SPLASH_DELAY_SEC = GO_FISH_SPLASH_DELAY_MS / 1000;
import { getGameRng } from './GameRng';
import { FishType, GamePhase, type FullGameState } from './Types';

function smooth01(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

function easeOutCubic(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 3;
}

function easeInQuad(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u;
}

function easeOutQuad(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 2;
}

function oceanSurfaceLayout(): { surfaceDrawH: number; surfaceDrawW: number; scrollRange: number } {
  const surfaceDrawH = OCEAN_SURFACE_DRAW_H;
  const surfaceDrawW = (OCEAN_SURFACE_NATURAL_W / OCEAN_SURFACE_NATURAL_H) * surfaceDrawH;
  return { surfaceDrawH, surfaceDrawW, scrollRange: Math.max(0, surfaceDrawW - CANVAS_WIDTH) };
}

function diveParentYEndpoints(): { yStart: number; yEnd: number } {
  const { surfaceDrawH } = oceanSurfaceLayout();
  return {
    yStart: CANVAS_HEIGHT + surfaceDrawH + 24,
    yEnd: -surfaceDrawH - 28,
  };
}

function bubbleFadeInAlpha(age: number): number {
  return Math.min(1, age / OCEAN_BUBBLE_FADE_IN_SEC);
}

function breachSegmentEnds(): {
  introEnd: number;
  playerExitStart: number;
  escapeEnd: number;
  leaderboardStart: number;
  fadeEnd: number;
  moveEnd: number;
  total: number;
} {
  const D = DIVE_TRANSITION;
  const introEnd = D.breachIntroZoomDuration;
  const playerExitStart = introEnd + D.breachPlayerExitDelay;
  const escapeEnd = introEnd + D.breachFishEscapeDuration;
  const leaderboardStart = escapeEnd + D.breachLeaderboardDelayDuration;
  const fadeEnd = leaderboardStart + D.waterlineFadeOutDuration;
  const moveEnd = fadeEnd + D.waterlineFallDuration;
  const total = GAME_TO_MENU_BREACH_TOTAL_SEC;
  return { introEnd, playerExitStart, escapeEnd, leaderboardStart, fadeEnd, moveEnd, total };
}

export function isBreachLeaderboardListening(_state: FullGameState): boolean {
  return false;
}

export function isBreachLeaderboardVisible(_state: FullGameState): boolean {
  return false;
}

function spawnBubbleCluster(state: FullGameState, surfaceDrawH: number): void {
  const rng = getGameRng();
  const n = 2 + Math.floor(rng.next() * 4);
  for (let i = 0; i < n; i += 1) {
    state.oceanBubbles.push({
      lx: rng.between(24, CANVAS_WIDTH - 24),
      ly: rng.between(surfaceDrawH + 36, Math.min(CANVAS_HEIGHT * 0.96, CANVAS_HEIGHT - 40)),
      variant: Math.floor(rng.next() * 7),
      age: 0,
      vx: rng.between(-22, 22),
    });
  }
}

function updateOceanBubblesDrift(state: FullGameState, dt: number): void {
  for (const b of state.oceanBubbles) {
    b.age += dt;
    b.ly -= OCEAN_BUBBLE_RISE_SPEED * dt;
    b.lx += (b.vx ?? 0) * dt;
  }
  state.oceanBubbles = state.oceanBubbles.filter((b) => b.ly > -160);
}

/** Start menu → game dive (caller runs `resetForNewDive` and closes panels). */
export function playMenuToGameTransition(state: FullGameState): void {
  if (state.phase === GamePhase.Diving || state.phase === GamePhase.Breaching) return;
  state.phase = GamePhase.Diving;
  state.diveTimer = 0;
  state.oceanBubbles = [];
  state.diveJumpSfxPlayed = false;
  state.diveSplashEmitted = false;
  state.pendingEvents.push({ type: 'diveStarted' });
}

/** Begin breach-out (caller clears net VFX and sets `roundTimeLeft = 0`). */
export function playGameToMenuTransition(state: FullGameState): void {
  if (state.phase === GamePhase.Breaching) return;
  state.phase = GamePhase.Breaching;
  state.breachTimer = 0;
  state.oceanBubbles = [];
  state.harpoonGunAnimElapsed = -1;
  state.breachLeaderboardDismissed = false;
  state.breachLeaderboardFadeElapsed = 0;
}

export function updateDiveTransition(state: FullGameState, dt: number): void {
  if (state.phase === GamePhase.Diving) {
    updateDivingTransition(state, dt);
  } else if (state.phase === GamePhase.Breaching) {
    updateBreachingTransition(state, dt);
  }
}

function updateDivingTransition(state: FullGameState, dt: number): void {
  const rng = getGameRng();
  const { surfaceDrawH } = oceanSurfaceLayout();
  const seg = getMenuToGameDiveSegmentEnds();
  const D = DIVE_TRANSITION;
  const prevT = state.diveTimer;
  state.diveTimer += dt;
  const t = state.diveTimer;

  // Jump SFX once at fall start
  if (!state.diveJumpSfxPlayed && prevT < seg.delayEnd && t >= seg.delayEnd) {
    state.diveJumpSfxPlayed = true;
    state.pendingEvents.push({ type: 'diverJumped' });
  }

  if (!state.diveSplashEmitted && t >= GO_FISH_SPLASH_DELAY_SEC) {
    state.diveSplashEmitted = true;
    state.pendingEvents.push({ type: 'diverSplash' });
  }

  // Bubbles while waterline moves
  const wasMove = prevT >= seg.waterlineStart && prevT < seg.moveEnd;
  const inMove = t >= seg.waterlineStart && t < seg.moveEnd;
  if (inMove && !wasMove) {
    state.pendingEvents.push({ type: 'transitionWaterlineBubbles' });
  }
  if (inMove) {
    const expected = D.bubbleSpawnRate * dt;
    let nSpawn = Math.floor(expected);
    if (rng.next() < expected - nSpawn) nSpawn += 1;
    for (let i = 0; i < nSpawn; i += 1) spawnBubbleCluster(state, surfaceDrawH);
  }

  updateOceanBubblesDrift(state, dt);

  if (t >= seg.total) {
    state.diveTimer = seg.total;
    state.phase = GamePhase.Action;
    state.oceanBubbles = [];
  }
}

function updateBreachingTransition(state: FullGameState, dt: number): void {
  const rng = getGameRng();
  const { surfaceDrawH } = oceanSurfaceLayout();
  const seg = breachSegmentEnds();
  const D = DIVE_TRANSITION;

  const prevTb = state.breachTimer;
  state.breachTimer += dt;
  if (!state.breachLeaderboardDismissed && state.breachTimer > seg.fadeEnd) {
    state.breachTimer = seg.fadeEnd;
  }
  const t = state.breachTimer;

  if (t >= seg.introEnd && t < seg.escapeEnd) {
    for (const fish of state.fish) {
      if (!fish.alive) continue;
      if (fish.type === FishType.Jelly) {
        const dir = fish.y < CANVAS_HEIGHT * 0.5 ? -1 : 1;
        fish.vx = 0;
        fish.vy = dir * D.breachFishEscapeSpeed;
        fish.y += fish.vy * dt;
      } else {
        const dir = fish.x < CANVAS_WIDTH * 0.5 ? -1 : 1;
        fish.vx = dir * D.breachFishEscapeSpeed;
        fish.vy *= 0.4;
        fish.x += fish.vx * dt;
        fish.y += fish.vy * dt;
      }
    }
    for (const spear of state.spears) {
      spear.y += D.breachFishEscapeSpeed * 0.85 * dt;
    }
  }

  // Sound + bubbles: start with the waterline phase (strip fade-in at yEnd), not when physics starts at fadeEnd.
  const inWaterlineChurn = t >= seg.leaderboardStart && t < seg.moveEnd;
  const firstTickAfterLeaderboardGate =
    prevTb <= seg.leaderboardStart + 1e-5 && t > seg.leaderboardStart && t < seg.moveEnd;
  if (firstTickAfterLeaderboardGate) {
    state.pendingEvents.push({ type: 'transitionWaterlineBubbles' });
  }
  if (inWaterlineChurn) {
    const expected = D.bubbleSpawnRate * dt;
    let nSpawn = Math.floor(expected);
    if (rng.next() < expected - nSpawn) nSpawn += 1;
    for (let i = 0; i < nSpawn; i += 1) spawnBubbleCluster(state, surfaceDrawH);
  }

  updateOceanBubblesDrift(state, dt);

  if (t >= seg.total) {
    state.breachTimer = seg.total;
    state.oceanBubbles = [];
    // finalizeRunToBoat is still invoked from GameLogic after this check
  }

  if (state.breachLeaderboardDismissed) {
    state.breachLeaderboardFadeElapsed += dt;
  }
}

function buildBackdropDiving(t: number): { boat: number; underwater: number } | null {
  const seg = getMenuToGameDiveSegmentEnds();
  const M = DIVE_TRANSITION.waterlineRiseDuration;
  if (t < seg.moveEnd) {
    if (t < seg.waterlineStart) return { boat: 1, underwater: 0 };
    const rt = (t - seg.waterlineStart) / M;
    if (rt < 0.5) return { boat: 1, underwater: 0 };
    const u = smooth01((rt - 0.5) / 0.5);
    return { boat: 1 - u, underwater: u };
  }
  return { boat: 0, underwater: 1 };
}

function buildWaterlineDiving(t: number): {
  parentY: number;
  surfaceScrollX: number;
  groupAlpha: number;
} | null {
  const { scrollRange } = oceanSurfaceLayout();
  const { yStart, yEnd } = diveParentYEndpoints();
  const seg = getMenuToGameDiveSegmentEnds();
  const M = DIVE_TRANSITION.waterlineRiseDuration;
  const F = DIVE_TRANSITION.waterlineFadeOutDuration;

  if (t < seg.waterlineStart) {
    return {
      parentY: yStart,
      surfaceScrollX: 0,
      groupAlpha: 1,
    };
  }
  if (t < seg.moveEnd) {
    const elapsed = t - seg.waterlineStart;
    const rt = M > 1e-6 ? elapsed / M : 1;
    const u = smooth01(rt);
    const parentY = yStart + (yEnd - yStart) * u;
    const maxScroll = Math.min(scrollRange, DIVE_TRANSITION.surfaceScrollSpeed * elapsed);
    return {
      parentY,
      surfaceScrollX: -maxScroll,
      groupAlpha: 1,
    };
  }
  if (t < seg.fadeEnd) {
    const uFade = F > 1e-6 ? (t - seg.moveEnd) / F : 1;
    return {
      parentY: yEnd,
      surfaceScrollX: -scrollRange,
      groupAlpha: 1 - easeOutCubic(smooth01(uFade)),
    };
  }
  return null;
}

/** Game→menu: diver rises from jump depth toward deck (mirrors menu→game `easeInQuad` fall with `easeOutQuad`). */
function buildDiverBreachingLand(t: number): DiveTransitionDraw['diver'] | null {
  const seg = breachSegmentEnds();
  const R = DIVE_TRANSITION.breachBoatRevealDuration;
  const revealStart = seg.moveEnd - R;
  if (t < revealStart || t >= seg.moveEnd) return null;

  const landT = Math.min(1, Math.max(0, (t - revealStart) / Math.max(1e-6, R)));
  const landU = easeOutQuad(landT);

  const D = DIVE_TRANSITION;
  const boat = getBoatBackgroundDrawRect();
  const anchorX = boat.x + D.diverDeckAnchor.xFrac * boat.w;
  const anchorY = boat.y + D.diverDeckAnchor.yFrac * boat.h;
  const standW = D.diverDrawWidth;
  const standH = (standW * D.diverStandNaturalH) / D.diverStandNaturalW;
  const jumpW = D.diverDrawWidth * 1.05;
  const jumpH = (jumpW * D.diverJumpNaturalH) / D.diverJumpNaturalW;
  const standPivot = D.diverStandFeetPivotY;
  const jumpPivot = D.diverJumpFeetPivotY;

  const feetY = anchorY + D.diverFallDistance * (1 - landU);
  const standSnapPx = Math.max(6, D.diverFallDistance * 0.012);
  if (feetY <= anchorY + standSnapPx) {
    return {
      pose: 'stand',
      x: anchorX - standW * 0.5,
      y: anchorY - standH * standPivot,
      alpha: 1,
      drawW: standW,
      drawH: standH,
    };
  }

  const y = feetY - jumpH * jumpPivot;
  if (y > CANVAS_HEIGHT + jumpH) return null;

  return {
    pose: 'jump',
    x: anchorX - jumpW * 0.5,
    y,
    alpha: 1,
    drawW: jumpW,
    drawH: jumpH,
  };
}

function buildDiverDiving(t: number): DiveTransitionDraw['diver'] {
  const D = DIVE_TRANSITION;
  const seg = getMenuToGameDiveSegmentEnds();
  const boat = getBoatBackgroundDrawRect();
  const anchorX = boat.x + D.diverDeckAnchor.xFrac * boat.w;
  const anchorY = boat.y + D.diverDeckAnchor.yFrac * boat.h;
  const standW = D.diverDrawWidth;
  const standH = (standW * D.diverStandNaturalH) / D.diverStandNaturalW;
  const jumpW = D.diverDrawWidth * 1.05;
  const jumpH = (jumpW * D.diverJumpNaturalH) / D.diverJumpNaturalW;
  const standPivot = D.diverStandFeetPivotY;
  const jumpPivot = D.diverJumpFeetPivotY;

  if (t >= seg.moveEnd) return null;

  if (t < seg.delayEnd) {
    return {
      pose: 'stand',
      x: anchorX - standW * 0.5,
      y: anchorY - standH * standPivot,
      alpha: 1,
      drawW: standW,
      drawH: standH,
    };
  }

  const fallDur = Math.max(1e-6, seg.fallEnd - seg.delayEnd);
  const fallT = Math.min(1, Math.max(0, (t - seg.delayEnd) / fallDur));
  const fallU = easeInQuad(fallT);
  const fallY = D.diverFallDistance * fallU;
  const y = anchorY - jumpH * jumpPivot + fallY;
  if (y > CANVAS_HEIGHT + jumpH) return null;

  return {
    pose: 'jump',
    x: anchorX - jumpW * 0.5,
    y,
    alpha: 1,
    drawW: jumpW,
    drawH: jumpH,
  };
}

function buildDiveCameraDiving(t: number): DiveTransitionDraw['camera'] {
  const D = DIVE_TRANSITION;
  const seg = getMenuToGameDiveSegmentEnds();
  const boat = getBoatBackgroundDrawRect();
  const x = boat.x + D.diverDeckAnchor.xFrac * boat.w;
  const y = boat.y + D.diverDeckAnchor.yFrac * boat.h;
  const u = smooth01(t / Math.max(1e-6, seg.fallEnd));
  return {
    x,
    y,
    zoom: 1 + (D.cameraZoom - 1) * u,
  };
}

function buildBackdropBreaching(t: number): { boat: number; underwater: number } | null {
  const seg = breachSegmentEnds();
  if (t < seg.fadeEnd) return null;
  if (t > seg.moveEnd) return null;
  return { boat: 1, underwater: 0 };
}

function buildWaterlineBreaching(t: number): {
  parentY: number;
  surfaceScrollX: number;
  groupAlpha: number;
} | null {
  const { scrollRange } = oceanSurfaceLayout();
  const { yStart, yEnd } = diveParentYEndpoints();
  const seg = breachSegmentEnds();
  const M = DIVE_TRANSITION.waterlineFallDuration;
  const F = DIVE_TRANSITION.waterlineFadeOutDuration;

  if (t < seg.leaderboardStart) return null;
  if (t > seg.moveEnd) return null;
  if (t <= seg.fadeEnd) {
    return {
      parentY: yEnd,
      surfaceScrollX: -scrollRange,
      groupAlpha: smooth01((t - seg.leaderboardStart) / Math.max(1e-6, F)),
    };
  }
  const tm = (t - seg.fadeEnd) / Math.max(1e-6, M);
  const u = smooth01(tm);
  return {
    parentY: yEnd + (yStart - yEnd) * u,
    surfaceScrollX: -scrollRange * (1 - u),
    groupAlpha: 1,
  };
}

function getBreachBoatRevealAlphaFromT(t: number): number {
  const seg = breachSegmentEnds();
  const R = DIVE_TRANSITION.breachBoatRevealDuration;
  const revealStart = seg.moveEnd - R;
  if (t <= revealStart) return 0;
  return smooth01((t - revealStart) / Math.max(1e-6, R));
}

function getBreachBoatMenuRevealAlphaFromT(t: number): number {
  const seg = breachSegmentEnds();
  const menuFadeIn = DIVE_TRANSITION.breachBoatMenuFadeInDuration;
  const fadeStart = seg.moveEnd - menuFadeIn;
  if (t < fadeStart) return 0;
  return smooth01((t - fadeStart) / Math.max(1e-6, menuFadeIn));
}

function getBreachUiAlphaFromT(t: number): number {
  const seg = breachSegmentEnds();
  if (t <= 0) return 1;
  if (t < seg.introEnd) return 1 - smooth01(t / Math.max(1e-6, seg.introEnd));
  return 0;
}

function getBreachPlayerExitOffsetFromT(t: number): number {
  const seg = breachSegmentEnds();
  const u = smooth01((t - seg.playerExitStart) / Math.max(1e-6, seg.escapeEnd - seg.playerExitStart));
  return DIVE_TRANSITION.breachPlayerExitDistance * u;
}

function getBreachCameraZoomFromT(t: number): number {
  const seg = breachSegmentEnds();
  const u = smooth01(t / Math.max(1e-6, seg.introEnd));
  return 1 + (DIVE_TRANSITION.breachCameraZoom - 1) * u;
}

function getBreachPlaceholderOverlayAlpha(state: FullGameState, t: number): number {
  const seg = breachSegmentEnds();
  const D = DIVE_TRANSITION;
  if (t < seg.leaderboardStart) return 0;
  const fadeIn = 0.12;
  const alphaIn = smooth01(Math.min(1, (t - seg.leaderboardStart) / Math.max(1e-6, fadeIn)));
  if (!state.breachLeaderboardDismissed) {
    return Math.min(1, alphaIn);
  }
  const uOut = smooth01(Math.min(1, state.breachLeaderboardFadeElapsed / Math.max(1e-6, D.breachLeaderboardFadeDuration)));
  return alphaIn * (1 - uOut);
}

export function isBreachingAwaitingConfirm(state: FullGameState): boolean {
  if (state.phase !== GamePhase.Breaching || state.breachLeaderboardDismissed) return false;
  const seg = breachSegmentEnds();
  return state.breachTimer >= seg.leaderboardStart + 0.12;
}

export function buildDiveTransitionDraw(state: FullGameState): DiveTransitionDraw | null {
  if (state.phase !== GamePhase.Diving && state.phase !== GamePhase.Breaching) return null;

  const { surfaceDrawH, surfaceDrawW } = oceanSurfaceLayout();
  const segDive = getMenuToGameDiveSegmentEnds();
  const segBreach = breachSegmentEnds();

  if (state.phase === GamePhase.Diving) {
    const t = state.diveTimer;
    const backdrop = buildBackdropDiving(t);
    const wlCore = buildWaterlineDiving(t);
    const waterline = wlCore == null
      ? null
      : {
        parentY: wlCore.parentY,
        surfaceScrollX: wlCore.surfaceScrollX,
        surfaceDrawH,
        surfaceDrawW,
        groupAlpha: wlCore.groupAlpha,
      };

    const bubbles = state.oceanBubbles.map((b) => ({
      variant: b.variant,
      lx: b.lx,
      ly: b.ly,
      alpha: bubbleFadeInAlpha(b.age),
    }));

    const boatOverlayAlpha = smooth01(t / Math.max(1e-6, segDive.boatFadeEnd));
    const menuUiAlpha = Math.max(0, 1 - smooth01(t / Math.max(1e-6, segDive.boatFadeEnd)));

    let oceanOverlayAlpha = 0;
    if (t >= segDive.fadeEnd && t < segDive.total) {
      oceanOverlayAlpha = 1 - smooth01((t - segDive.fadeEnd) / Math.max(1e-6, segDive.total - segDive.fadeEnd));
    }

    return {
      backdrop,
      waterline,
      bubbles,
      diver: buildDiverDiving(t),
      camera: buildDiveCameraDiving(t),
      breachUiAlpha: 1,
      breachPlayerExitOffset: 0,
      breachCameraZoom: 1,
      breachLeaderboardAlpha: 0,
      boatOverlayAlpha,
      menuUiAlpha,
      oceanOverlayAlpha,
      breachShowBoatRevealOnly: false,
      breachBoatRevealAlpha: 0,
      breachBoatMenuRevealAlpha: 1,
    };
  }

  const t = state.breachTimer;
  const breachShowBoatRevealOnly = t >= segBreach.moveEnd;
  const backdrop = buildBackdropBreaching(t);
  const wlCore = buildWaterlineBreaching(t);
  const waterline = wlCore == null
    ? null
    : {
      parentY: wlCore.parentY,
      surfaceScrollX: wlCore.surfaceScrollX,
      surfaceDrawH,
      surfaceDrawW,
      groupAlpha: wlCore.groupAlpha,
    };

  const bubbles = state.oceanBubbles.map((b) => ({
    variant: b.variant,
    lx: b.lx,
    ly: b.ly,
    alpha: bubbleFadeInAlpha(b.age),
  }));

  return {
    backdrop,
    waterline,
    bubbles,
    diver: buildDiverBreachingLand(t),
    camera: null,
    breachUiAlpha: getBreachUiAlphaFromT(t),
    breachPlayerExitOffset: getBreachPlayerExitOffsetFromT(t),
    breachCameraZoom: getBreachCameraZoomFromT(t),
      breachLeaderboardAlpha: getBreachPlaceholderOverlayAlpha(state, t),
    boatOverlayAlpha: 0,
    menuUiAlpha: 1,
    oceanOverlayAlpha: 0,
    breachShowBoatRevealOnly,
    breachBoatRevealAlpha: getBreachBoatRevealAlphaFromT(t),
    breachBoatMenuRevealAlpha: getBreachBoatMenuRevealAlphaFromT(t),
  };
}
