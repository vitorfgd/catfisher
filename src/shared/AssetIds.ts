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
  fisherman: 'fisherman',
  bubble: 'bubble',
  underwaterBg: 'underwaterBg',
  playerCat: 'playerCat',
  /** Bottom-fixed turret; line/spear emits from the cannon muzzle in code */
  playerTurret: 'playerTurret',
  boatBg: 'boatBg',
  boatSprite: 'boatSprite',
  /** Boat menu title art (full logo PNG). */
  titleLogo: 'titleLogo',

  // Upgrade sprites (level 1-5)
  upSpeargun1: 'upSpeargun1',
  upSpeargun2: 'upSpeargun2',
  upSpeargun3: 'upSpeargun3',
  upSpeargun4: 'upSpeargun4',
  upSpeargun5: 'upSpeargun5',
  upHaul1: 'upHaul1',
  upHaul2: 'upHaul2',
  upHaul3: 'upHaul3',
  upHaul4: 'upHaul4',
  upHaul5: 'upHaul5',
  upOxygen1: 'upOxygen1',
  upOxygen2: 'upOxygen2',
  upOxygen3: 'upOxygen3',
  upOxygen4: 'upOxygen4',
  upOxygen5: 'upOxygen5',

  // Consumable and HUD icons
  iconNet: 'iconNet',
  iconBait: 'iconBait',
  iconCoin: 'iconCoin',
  /** FTUE: finger pointing at fish to tap (points right) */
  ftueHand: 'ftueHand',
} as const;
