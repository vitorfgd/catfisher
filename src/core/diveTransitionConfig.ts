/**
 * Single source of tunables for the boat ↔ ocean wipe transition.
 * Durations are in seconds. Positions are in logical canvas pixels where noted.
 *
 * Legacy names in `Constants.ts` (`OCEAN_TRANSITION_*`, `OCEAN_DIVE_TOTAL_SEC`, …)
 * are derived from these values so other modules keep stable imports.
 */
/** Menu→game fall duration. */
const DIVER_FALL_DURATION_SEC = 1.05 as const;

/** Simulated seconds on `diveTimer` before `diverSplash` (menu→ocean); authored as ms for authoring convenience. */
export const GO_FISH_SPLASH_DELAY_MS = 1000;

export const DIVE_TRANSITION = {
  /** Menu→game: extra boat background fades in over the UI while the diver idles. */
  boatFadeInDuration: 0.35,
  /** Menu→game: hold diver standing on deck before jump. */
  diverJumpDelay: 0.15,
  /** Menu→game: diver falls toward the water (ease-in quad on Y). */
  diverFallDuration: DIVER_FALL_DURATION_SEC,
  diverFallDistance: 980,
  /** Waterline begins this many seconds before the fall pose finishes, so it can engulf the diver. */
  waterlineLeadInDuration: 0.78,
  /** Menu→game: camera push toward the diver before the waterline rises. */
  cameraZoom: 1.55,
  /** Menu→game: waterline parent moves from below screen to above (wipe reveals ocean). */
  waterlineRiseDuration: 1.29,
  /** Game→menu: same strip motion inverted (top → bottom). */
  waterlineFallDuration: 1.29,
  /** After the strip reaches its end position, fade the whole VFX group out. */
  waterlineFadeOutDuration: 0.51,
  /**
   * Menu→game: after the waterline VFX fades, briefly keep a full-screen underwater overlay
   * before switching to Action (crossfade into real gameplay view).
   */
  oceanOverlayFadeOutDuration: 0.28,
  /** Game→menu: small camera push before the escape beat starts. */
  breachIntroZoomDuration: 0.5,
  breachCameraZoom: 1.14,
  /** Game→menu: fish scatter before the leaderboard appears. */
  breachFishEscapeDuration: 1.0,
  breachFishEscapeSpeed: 1050,
  /** Game→menu: player/gun exit begins this long after fish start fleeing. */
  breachPlayerExitDelay: 0.5,
  breachPlayerExitDistance: 560,
  /** Game→menu: hold on clean underwater bg before showing leaderboard. */
  breachLeaderboardDelayDuration: 0.5,
  /** Game→menu: leaderboard fades away after tap before the waterline transition starts. */
  breachLeaderboardFadeDuration: 0.28,
  /** Game→menu: boat + diver land-in, ending exactly when the transition finalizes. */
  breachBoatRevealDuration: DIVER_FALL_DURATION_SEC,
  /** Game→menu: fades stats / GO FISH in during the end of the diver landing. */
  breachBoatMenuFadeInDuration: 0.42,
  /** Bubble clusters spawned per second while the waterline moves (dive + breach). */
  bubbleSpawnRate: 14,
  /** Horizontal scroll speed for `vfxWaterSurface` during the move segment (px/s). */
  surfaceScrollSpeed: 1100,
  /**
   * Deck contact point in **boat background UV space** (same zoomed rect as `drawBoatBackgroundLayer`).
   * (0,0) = top-left of scaled boat image; feet are placed at this point via pivots below.
   */
  diverDeckAnchor: { xFrac: 0.3, yFrac: 0.265 },
  diverDrawWidth: 100,
  /** Standing sprite: feet row as fraction of sprite height from top (0–1). */
  diverStandFeetPivotY: 0.88,
  /** Jump sprite: feet row as fraction of sprite height from top (0–1). */
  diverJumpFeetPivotY: 0.84,
  diverStandNaturalW: 369,
  diverStandNaturalH: 456,
  diverJumpNaturalW: 500,
  diverJumpNaturalH: 550,
} as const;

export function getMenuToGameDiveSegmentEnds(): {
  boatFadeEnd: number;
  delayEnd: number;
  fallEnd: number;
  waterlineStart: number;
  moveEnd: number;
  fadeEnd: number;
  total: number;
} {
  const D = DIVE_TRANSITION;
  const boatFadeEnd = D.boatFadeInDuration;
  const delayEnd = boatFadeEnd + D.diverJumpDelay;
  const fallEnd = delayEnd + D.diverFallDuration;
  const waterlineStart = Math.max(delayEnd, fallEnd - D.waterlineLeadInDuration);
  const moveEnd = waterlineStart + D.waterlineRiseDuration;
  const fadeEnd = moveEnd + D.waterlineFadeOutDuration;
  const total = fadeEnd + D.oceanOverlayFadeOutDuration;
  return { boatFadeEnd, delayEnd, fallEnd, waterlineStart, moveEnd, fadeEnd, total };
}

/** Total `Diving` phase duration before switching to `Action`. */
export const MENU_TO_GAME_DIVE_TOTAL_SEC = getMenuToGameDiveSegmentEnds().total;

/** Total `Breaching` phase duration before `finalizeRunToBoat`. */
export const GAME_TO_MENU_BREACH_TOTAL_SEC =
  DIVE_TRANSITION.breachIntroZoomDuration
  + DIVE_TRANSITION.breachFishEscapeDuration
  + DIVE_TRANSITION.breachLeaderboardDelayDuration
  + DIVE_TRANSITION.waterlineFadeOutDuration
  + DIVE_TRANSITION.waterlineFallDuration;
