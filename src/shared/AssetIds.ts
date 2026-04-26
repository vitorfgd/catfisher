// Stable logical asset IDs shared by core/render/platform layers.
// Keep this module platform-neutral so browser and MHS adapters can map IDs differently.

export const AssetIds = {
  fishSmall: 'fishSmall',
  fishMedium: 'fishMedium',
  fishLarge: 'fishLarge',
  fishRare: 'fishRare',
  fishJelly: 'fishJelly',
  fishPuffer: 'fishPuffer',
  fishTreasure: 'fishTreasure',
  /** Armored rock boss */
  fishBoss: 'fishBoss',
  fisherman: 'fisherman',
  bubble: 'bubble',
  underwaterBg: 'underwaterBg',
  playerCat: 'playerCat',
  boatBg: 'boatBg',
  boatSprite: 'boatSprite',

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
} as const;
