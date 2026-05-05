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
