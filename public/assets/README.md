Place browser prototype sprites in this directory.

Expected filenames are defined in `src/platform/AssetManifest.ts` as `assets/<file>.png`.
During development, missing files are replaced by generated fallback placeholders and reported in console warnings.

This keeps asset URLs stable and ready to map into static TextureAsset declarations in Meta Horizon Studio.
