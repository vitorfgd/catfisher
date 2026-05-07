# MHS Flat Script Map

The MHS guide requires all TypeScript files to live directly in `scripts/` with flat relative imports. Keep the browser project structure as-is; use this map when copying into an MHS project.

## Copy With Import Rewrites

| Browser path | MHS script |
|--------------|------------|
| `src/core/ActionViewTransform.ts` | `scripts/ActionViewTransform.ts` |
| `src/core/Constants.ts` | `scripts/Constants.ts` |
| `src/core/diveTransitionConfig.ts` | `scripts/DiveTransitionConfig.ts` |
| `src/core/diveTransitionController.ts` | `scripts/DiveTransitionController.ts` |
| `src/core/FishSystem.ts` | `scripts/FishSystem.ts` |
| `src/core/GameLogic.ts` | `scripts/GameLogic.ts` |
| `src/core/GameRng.ts` | `scripts/GameRng.ts` |
| `src/core/ParticleSystem.ts` | `scripts/ParticleSystem.ts` |
| `src/core/Rng.ts` | `scripts/Rng.ts` |
| `src/core/SpearSystem.ts` | `scripts/SpearSystem.ts` |
| `src/core/Types.ts` | `scripts/Types.ts` |
| `src/core/UpgradeSystem.ts` | `scripts/UpgradeSystem.ts` |
| `src/render/boatScreen.ts` | `scripts/BoatScreen.ts` |
| `src/render/diveTransition.ts` | `scripts/DiveTransitionRenderer.ts` |
| `src/render/GameRenderer.ts` | `scripts/GameRenderer.ts` |
| `src/render/hud.ts` | `scripts/Hud.ts` |
| `src/render/oceanTransition.ts` | `scripts/OceanTransition.ts` |
| `src/render/RenderFrame.ts` | `scripts/RenderFrame.ts` |
| `src/render/RenderState.ts` | `scripts/RenderState.ts` |
| `src/render/theme.ts` | `scripts/Theme.ts` |
| `src/render/upgradePresentation.ts` | `scripts/UpgradePresentation.ts` |
| `src/shared/AssetIds.ts` | `scripts/AssetIds.ts` |
| `src/shared/BoatUiLayout.ts` | `scripts/BoatUiLayout.ts` |
| `src/shared/ConsistencyChecks.ts` | `scripts/ConsistencyChecks.ts` |
| `src/shared/InputCommands.ts` | `scripts/InputCommands.ts` |
| `src/shared/MhsAssetMap.ts` | `scripts/MhsAssetMap.ts` |
| `src/shared/UiLayout.ts` | `scripts/UiLayout.ts` |
| `src/shared/UpgradeBalance.ts` | `scripts/UpgradeBalance.ts` |

## Replace With MHS Scripts

| Browser path | MHS replacement |
|--------------|-----------------|
| `src/main.ts` | `scripts/FishingGameComponent.ts` |
| `src/render/Canvas2DRenderer.ts` | `scripts/MhsDrawingRenderer.ts` |
| `src/platform/AssetManifest.ts` | `scripts/Assets.ts` |
| `src/platform/BrowserAudioAdapter.ts` | `scripts/FishingAudioComponent.ts` |
| `src/platform/BrowserGameLoop.ts` | Lifecycle methods in `FishingGameComponent.ts` |
| `src/platform/BrowserInputAdapter.ts` | `scripts/MhsInputAdapter.ts` |
| `src/platform/FtueStorage.ts` | `scripts/MhsProgressStorage.ts` |
| `src/platform/TutorialStorage.ts` | `scripts/MhsProgressStorage.ts` |
| `src/platform/GameEvents.ts` | `scripts/GameEvents.ts` or direct type exports |
| `src/platform/LeaderboardAdapter.ts` | `scripts/MhsLeaderboardAdapter.ts` |

## Do Not Copy

- `*.test.ts`
- `src/vite-env.d.ts`
- `index.html`
- `vite.config.ts`
- `vitest.config.ts`
- Browser `public/` asset URLs; import images into Studio `sprites/` instead.

## Import Rewrite Rule

After flattening, replace nested imports such as:

```ts
import { CANVAS_WIDTH } from '../core/Constants';
```

with:

```ts
import { CANVAS_WIDTH } from './Constants';
```

Avoid duplicate script names after PascalCase normalization. Current map has no planned collisions.
