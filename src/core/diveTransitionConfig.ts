/**
 * Single source of tunables for the boat ↔ ocean wipe transition.
 * Durations are in seconds. Positions are in logical canvas pixels where noted.
 *
 * Legacy names in `Constants.ts` (`OCEAN_TRANSITION_*`, `OCEAN_DIVE_TOTAL_SEC`, …)
 * are derived from these values so other modules keep stable imports.
 */
export const DIVE_TRANSITION = {
  /** Menu→game: extra boat background fades in over the UI while the diver idles. */
  boatFadeInDuration: 0.35,
  /** Menu→game: hold diver standing on deck before jump. */
  diverJumpDelay: 0.15,
  /** Menu→game: diver falls toward the water (ease-in on Y). */
  diverFallDuration: 1.05,
  diverFallDistance: 980,
  /** Waterline begins this many seconds before the fall pose finishes, so it can engulf the bear. */
  waterlineLeadInDuration: 0.78,
  /** Menu→game: camera push toward the bear before the waterline rises. */
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
  /** Game→menu: fade full boat screen before `Boat` phase. */
  breachBoatRevealDuration: 0.33,
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

/** Total `Diving` phase duration before switching to `Action`. */
export const MENU_TO_GAME_DIVE_TOTAL_SEC =
  DIVE_TRANSITION.boatFadeInDuration
  + DIVE_TRANSITION.diverJumpDelay
  + DIVE_TRANSITION.diverFallDuration
  + DIVE_TRANSITION.waterlineRiseDuration
  + DIVE_TRANSITION.waterlineFadeOutDuration
  + DIVE_TRANSITION.oceanOverlayFadeOutDuration;

/** Total `Breaching` phase duration before `finalizeRunToBoat`. */
export const GAME_TO_MENU_BREACH_TOTAL_SEC =
  DIVE_TRANSITION.breachIntroZoomDuration
  + DIVE_TRANSITION.breachFishEscapeDuration
  + DIVE_TRANSITION.breachLeaderboardDelayDuration
  + DIVE_TRANSITION.waterlineFadeOutDuration
  + DIVE_TRANSITION.waterlineFallDuration
  + DIVE_TRANSITION.breachBoatRevealDuration;
