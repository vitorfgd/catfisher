# MHS Asset Map

The browser build loads image URLs from `src/platform/AssetManifest.ts`. The MHS build should instead declare static `TextureAsset` values from the paths in `src/shared/MhsAssetMap.ts`.

Example MHS shape:

```ts
import { TextureAsset } from 'meta/worlds';
import { AssetIds } from './AssetIds';

export const MhsTextureById = {
  [AssetIds.fishSmall]: new TextureAsset('@sprites/fish-sprite.png'),
  // ...one entry per MHS_TEXTURE_PATHS item
} as const;
```

Rules:

- Keep asset IDs stable; rendering should continue to reference `AssetIds`, never raw paths.
- Use static `TextureAsset('@sprites/...')` string literals in MHS. Do not concatenate paths.
- Every live browser image asset must have a corresponding entry in `MHS_TEXTURE_PATHS`.
- Add `.png.assetmeta` sidecars when importing the files into Studio.
- If MHS cannot draw a sprite-sheet source rectangle reliably, split `vfx-bubble-sheet.png` into separate static sprites before porting.
