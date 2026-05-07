# Meta Horizon Studio porting checklist

This project follows a **core + `GameRenderer` + platform** split so the HTML5 shell can be replaced by a Horizon `DrawingSurface` + `DrawingCommandsBuilder` (or Noesis) shell. See the external *HTML5 Canvas to Meta Horizon Studio* guide in your own docs for full patterns.

| Browser / web | MHS (typical) |
|-----------------|---------------|
| `main.ts` (canvas, resize) | `CustomUiComponent`, XAML host |
| `BrowserGameLoop` (`rAF`, `update`, `drainEvents`) | world update + late update hooks |
| `BrowserInputAdapter` (pointer → `GameInputCommand`) | focus / interaction system |
| `Canvas2DRenderer` (implements `GameRenderer`) | `DrawingCommandsBuilder` (same draw ops) |
| `pushClipRect` / `popClip` (axis-aligned clip stack) | Equivalent scissor / clip rect in the MHS draw builder |
| `loadImages` + `AssetManifest` | `TextureAsset` / static Studio paths; map from [`AssetIds`](../src/shared/AssetIds.ts) |
| `BrowserAudioAdapter` (`drainEvents` / `GameEvent`) | `SoundComponent` or Studio audio |
| `FtueStorage` (`localStorage`) | platform persistence of your choice |
| `GameLogic` / `renderFrame` / `getRenderState` | **no change** — keep in shared TS |

**RNG:** use [`getGameRng`](../src/core/GameRng.ts) in core; in Studio tests, call `setGameRngForTests(new Rng(seed))` before `update` for determinism.

## Portability Contract

Files expected to port with import-path rewrites only:

- `src/core/*.ts`
- `src/render/RenderFrame.ts`
- `src/render/RenderState.ts`
- `src/render/GameRenderer.ts`
- `src/render/diveTransition.ts`
- `src/render/hud.ts`
- `src/render/boatScreen.ts`
- `src/render/upgradePresentation.ts`
- `src/shared/*.ts`

Files expected to be replaced by MHS-specific scripts:

- `src/main.ts`
- `src/render/Canvas2DRenderer.ts`
- `src/platform/AssetManifest.ts`
- `src/platform/BrowserAudioAdapter.ts`
- `src/platform/BrowserGameLoop.ts`
- `src/platform/BrowserInputAdapter.ts`
- `src/platform/FtueStorage.ts`
- `src/platform/TutorialStorage.ts`
- `src/platform/LeaderboardAdapter.ts` browser implementation

Portable files must not import browser, DOM, canvas, Vite, or MHS APIs. They should depend only on plain TypeScript modules, stable asset IDs, `GameInputCommand`, `GameEvent`, `RenderState`, and `GameRenderer`.

## Studio Shell Replacements

- `src/main.ts` becomes an MHS game component attached to the same entity as `CustomUiComponent`. On entity create, assign the canvas ViewModel to `customUi.dataContext`.
- `BrowserGameLoop` becomes `OnWorldUpdateEvent` for `update(state, dt, commands)` and `OnLateWorldUpdateEvent` for `renderFrame(mhsRenderer, getRenderState(state))`.
- `BrowserInputAdapter` becomes a focused-interaction adapter that converts MHS pointer/focus positions into the same `CANVAS_WIDTH` x `CANVAS_HEIGHT` logical coordinates.
- `AssetManifest` becomes static `TextureAsset("@sprites/...")` declarations. See [`MHS_ASSET_MAP.md`](./MHS_ASSET_MAP.md).
- `BrowserAudioAdapter` becomes an AudioHub script that maps `GameEvent` values to named child `SoundComponent` entities.
- `FtueStorage`, `TutorialStorage`, and the fake leaderboard become MHS persistence/service adapters. Core state should not change.

## Readiness Gates

Before copying code into MHS, run:

```bash
npm run check
npm test
npm run build
```

`npm run check` includes `check:port`, which verifies that portable modules have no forbidden platform imports and that the MHS asset map covers every browser image asset.
