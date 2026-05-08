import { AssetIds } from './AssetIds';

/**
 * Future MHS static texture paths.
 *
 * MHS code should turn each value into `new TextureAsset("@sprites/...")`.
 * Keep these values literal and complete so the port-readiness check can verify
 * every browser image asset has a Studio asset plan before copying into MHS.
 */
export const MHS_TEXTURE_PATHS = {
  [AssetIds.fishSmall]: '@sprites/fish-sprite.png',
  [AssetIds.fishMedium]: '@sprites/fish-snapper.png',
  [AssetIds.fishLarge]: '@sprites/fish-shark.png',
  [AssetIds.fishLargeAttack]: '@sprites/fish-shark-attack.png',
  [AssetIds.fishRare]: '@sprites/fish-swordfish.png',
  [AssetIds.fishJelly]: '@sprites/fish-jellyfish.png',
  [AssetIds.fishPuffer]: '@sprites/fish-puffer.png',
  [AssetIds.fishTreasure]: '@sprites/treasure-chest-closed.png',
  [AssetIds.treasureChestOpen]: '@sprites/treasure-chest-open.png',
  [AssetIds.fishBoss]: '@sprites/fish-rock-boss.png',
  [AssetIds.fishClown]: '@sprites/fish-clown-metal.png',
  [AssetIds.underwaterBg]: '@sprites/underwater-bg.png',
  [AssetIds.boatBg]: '@sprites/boat-bg.png',
  [AssetIds.gameLogo]: '@sprites/game-logo.png',
  [AssetIds.upSpeargun1]: '@sprites/up-speargun-1.png',
  [AssetIds.upSpeargun2]: '@sprites/up-speargun-2.png',
  [AssetIds.upSpeargun3]: '@sprites/up-speargun-3.png',
  [AssetIds.upSpeargun4]: '@sprites/up-speargun-4.png',
  [AssetIds.upHaul1]: '@sprites/up-haul-1.png',
  [AssetIds.upHaul2]: '@sprites/up-haul-2.png',
  [AssetIds.upHaul3]: '@sprites/up-haul-3.png',
  [AssetIds.upHaul4]: '@sprites/up-haul-4.png',
  [AssetIds.upOxygen1]: '@sprites/up-oxygen-1.png',
  [AssetIds.upOxygen2]: '@sprites/up-oxygen-2.png',
  [AssetIds.upOxygen3]: '@sprites/up-oxygen-3.png',
  [AssetIds.upOxygen4]: '@sprites/up-oxygen-4.png',
  [AssetIds.iconNet]: '@sprites/icon-net.png',
  [AssetIds.iconBait]: '@sprites/icon-bait.png',
  [AssetIds.iconCoin]: '@sprites/icon-coin.png',
  [AssetIds.iconMusicOn]: '@sprites/ui-music-on.png',
  [AssetIds.iconMusicOff]: '@sprites/ui-music-off.png',
  [AssetIds.ftueHand]: '@sprites/ftue-hand.png',
  [AssetIds.vfxWaterSurface]: '@sprites/vfx-water-surface.png',
  [AssetIds.vfxWaterGradient]: '@sprites/vfx-water-gradient.png',
  [AssetIds.vfxBubbleSheet]: '@sprites/vfx-bubble-sheet.png',
  [AssetIds.vfxTeethTop]: '@sprites/vfx-teeth-top.png',
  [AssetIds.vfxTeethBottom]: '@sprites/vfx-teeth-bottom.png',
  [AssetIds.vfxTeethClamped]: '@sprites/vfx-teeth-clamped.png',
  [AssetIds.vfxNet]: '@sprites/vfx-net.png',
  [AssetIds.helmet]: '@sprites/helmet.png',
  [AssetIds.diverStand]: '@sprites/diver_stand.png',
  [AssetIds.diverJump]: '@sprites/diver_jump.png',
  [AssetIds.gun1]: '@sprites/gun_1.png',
} as const satisfies Record<(typeof AssetIds)[keyof typeof AssetIds], `@sprites/${string}`>;
