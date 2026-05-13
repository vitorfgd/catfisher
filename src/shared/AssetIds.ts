// Stable logical asset IDs shared by core/render/platform layers.
// Keep this module platform-neutral so browser and MHS adapters can map IDs differently.

export const AssetIds = {
  fishSmall: 'fishSmall',
  fishMedium: 'fishMedium',
  fishLarge: 'fishLarge',
  /** Frontal shark shown while charging the player. */
  fishLargeAttack: 'fishLargeAttack',
  /** Swordfish (rare / high value) */
  fishRare: 'fishRare',
  fishJelly: 'fishJelly',
  fishPuffer: 'fishPuffer',
  /** Closed / slightly cracked chest in-water + on rope */
  fishTreasure: 'fishTreasure',
  /** Full open frame for the treasure payout cinematic */
  treasureChestOpen: 'treasureChestOpen',
  /** Armored rock boss */
  fishBoss: 'fishBoss',
  /** Steampunk clownfish */
  fishClown: 'fishClown',
  underwaterBg: 'underwaterBg',
  boatBg: 'boatBg',
  boatSceneSky: 'boatSceneSky',
  boatSceneSurface1: 'boatSceneSurface1',
  boatSceneSurface2: 'boatSceneSurface2',
  boatSceneBoat: 'boatSceneBoat',
  boatSceneSurface3: 'boatSceneSurface3',
  boatSceneSurface4: 'boatSceneSurface4',
  boatSceneSurface5: 'boatSceneSurface5',
  gameLogo: 'gameLogo',

  // Upgrade sprites (level 1-4)
  upSpeargun1: 'upSpeargun1',
  upSpeargun2: 'upSpeargun2',
  upSpeargun3: 'upSpeargun3',
  upSpeargun4: 'upSpeargun4',
  upHaul1: 'upHaul1',
  upHaul2: 'upHaul2',
  upHaul3: 'upHaul3',
  upHaul4: 'upHaul4',
  upOxygen1: 'upOxygen1',
  upOxygen2: 'upOxygen2',
  upOxygen3: 'upOxygen3',
  upOxygen4: 'upOxygen4',

  // Consumable and HUD icons
  iconNet: 'iconNet',
  iconBait: 'iconBait',
  iconCoin: 'iconCoin',
  /** In-game music mute toggle (note icon). */
  iconMusicOn: 'iconMusicOn',
  /** In-game music mute toggle (note + strike). */
  iconMusicOff: 'iconMusicOff',
  /** Boat menu: opens leaderboard modal. */
  uiLeaderboard: 'uiLeaderboard',
  /** Boat leaderboard modal: podium fish splash above title. */
  leaderboardSplashArt: 'leaderboardSplashArt',
  /** Breach end overlay: diver splash above run summary. */
  endscreenSplashArt: 'endscreenSplashArt',
  /** FTUE: finger pointing at fish to tap (points right) */
  ftueHand: 'ftueHand',

  /** Ocean dive/breach transition — wide surface strip (black = transparent in VFX draw). */
  vfxWaterSurface: 'vfxWaterSurface',
  vfxWaterGradient: 'vfxWaterGradient',
  /** Sprite sheet: 3 singles + 4 clusters (see `oceanTransitionBubbles` rects). */
  vfxBubbleSheet: 'vfxBubbleSheet',

  /** Shark bite full-screen teeth (split → clamped). */
  vfxTeethTop: 'vfxTeethTop',
  vfxTeethBottom: 'vfxTeethBottom',
  vfxTeethClamped: 'vfxTeethClamped',
  /** Full-screen net sweep when using the net consumable */
  vfxNet: 'vfxNet',

  /** Bottom-anchored diving helmet (third-person frame) in underwater action. */
  helmet: 'helmet',
  /** Menu→game dive cinematic: diver on deck (369×456). */
  diverStand: 'diverStand',
  /** Menu→game dive cinematic: mid-air jump (500×550). */
  diverJump: 'diverJump',

  /** First-person harpoon gun (pivot top-center = muzzle / rope origin). */
  gun1: 'gun1',
} as const;
