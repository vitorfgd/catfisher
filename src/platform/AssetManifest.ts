import { AssetIds } from '../shared/AssetIds';

export const BrowserAssetManifest = {
  images: {
    [AssetIds.fishSmall]: 'assets/fish-sprite.png',
    [AssetIds.fishMedium]: 'assets/fish-snapper.png',
    [AssetIds.fishLarge]: 'assets/fish-shark.png',
    [AssetIds.fishRare]: 'assets/fish-angler.png',
    [AssetIds.fishJelly]: 'assets/fish-jellyfish.png',
    [AssetIds.fishPuffer]: 'assets/fish-puffer.png',
    [AssetIds.fishTreasure]: 'assets/fish-treasure.png',
    [AssetIds.fishBoss]: 'assets/fish-rock-boss.png',
    [AssetIds.fisherman]: 'assets/fisherman.png',
    [AssetIds.bubble]: 'assets/bubble-1.png',
    [AssetIds.underwaterBg]: 'assets/underwater-bg.png',
    [AssetIds.playerCat]: 'assets/player-cat.png',
    [AssetIds.boatBg]: 'assets/boat-bg.png',
    [AssetIds.boatSprite]: 'assets/boat-sprite.png',
    [AssetIds.upSpeargun1]: 'assets/up-speargun-1.png',
    [AssetIds.upSpeargun2]: 'assets/up-speargun-2.png',
    [AssetIds.upSpeargun3]: 'assets/up-speargun-3.png',
    [AssetIds.upSpeargun4]: 'assets/up-speargun-4.png',
    [AssetIds.upSpeargun5]: 'assets/up-speargun-5.png',
    [AssetIds.upHaul1]: 'assets/up-haul-1.png',
    [AssetIds.upHaul2]: 'assets/up-haul-2.png',
    [AssetIds.upHaul3]: 'assets/up-haul-3.png',
    [AssetIds.upHaul4]: 'assets/up-haul-4.png',
    [AssetIds.upHaul5]: 'assets/up-haul-5.png',
    [AssetIds.upOxygen1]: 'assets/up-oxygen-1.png',
    [AssetIds.upOxygen2]: 'assets/up-oxygen-2.png',
    [AssetIds.upOxygen3]: 'assets/up-oxygen-3.png',
    [AssetIds.upOxygen4]: 'assets/up-oxygen-4.png',
    [AssetIds.upOxygen5]: 'assets/up-oxygen-5.png',
    [AssetIds.iconNet]: 'assets/icon-net.png',
    [AssetIds.iconBait]: 'assets/icon-bait.png',
    [AssetIds.iconCoin]: 'assets/icon-coin.png',
  },
  sounds: {} as Record<string, string>,
} as const;

function toPublicAssetUrl(path: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  const relative = path.replace(/^\/+/, '');
  return `${base}/${relative}`;
}

function createMissingImageFallback(assetId: string): HTMLImageElement {
  const fallback = document.createElement('canvas');
  fallback.width = 64;
  fallback.height = 64;
  const ctx = fallback.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2A3442';
    ctx.fillRect(0, 0, fallback.width, fallback.height);
    ctx.strokeStyle = '#FF4D4D';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(56, 56);
    ctx.moveTo(56, 8);
    ctx.lineTo(8, 56);
    ctx.stroke();
    ctx.fillStyle = '#E7EDF5';
    ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(assetId.slice(0, 5).toUpperCase(), 32, 32);
  }
  const img = new Image();
  img.src = fallback.toDataURL('image/png');
  return img;
}

export async function loadImages(
  manifest: typeof BrowserAssetManifest,
): Promise<{ images: Record<string, HTMLImageElement>; missing: string[] }> {
  const result: Record<string, HTMLImageElement> = {};
  const missing: string[] = [];
  await Promise.all(
    Object.entries(manifest.images).map(
      ([id, src]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => { result[id] = img; resolve(); };
          img.onerror = () => {
            missing.push(id);
            result[id] = createMissingImageFallback(id);
            resolve();
          };
          img.src = toPublicAssetUrl(src);
        }),
    ),
  );
  return { images: result, missing };
}
