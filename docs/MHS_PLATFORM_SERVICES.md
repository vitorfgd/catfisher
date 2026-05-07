# MHS Platform Services

Core gameplay exposes three stable contracts for platform code:

- Input commands: `src/shared/InputCommands.ts`
- Game events: `GameEvent` from `src/core/Types.ts`
- Leaderboard shape: `LeaderboardAdapter` from `src/platform/LeaderboardAdapter.ts`

## Input

MHS input should emit only `GameInputCommand` values:

- `{ type: 'tap', x, y }`
- `{ type: 'divePress' }`
- `{ type: 'openUpgradePanel', id }`
- `{ type: 'buyUpgrade', id }`
- `{ type: 'buyConsumable', id }`
- `{ type: 'useConsumable', id }`

Convert focused-interaction coordinates into logical canvas coordinates before creating commands:

- X range: `0..CANVAS_WIDTH`
- Y range: `0..CANVAS_HEIGHT`
- Preserve the same hit-test helpers in `src/shared/UiLayout.ts`.

## Audio

MHS audio should subscribe to drained `GameEvent` values and play non-spatial sounds from an AudioHub entity.

Suggested child `SoundComponent` entity names:

- `FishHooked`
- `FishCaught`
- `TreasureCaught`
- `SpearFired`
- `DiveStarted`
- `DiverJumped`
- `RunEnded`
- `UpgradeBought`

Events that are service-only and do not need sound by default:

- `ftueDiveExited`
- `tutorialHintShown`

## Persistence

Browser persistence currently lives in `FtueStorage.ts` and `TutorialStorage.ts`. MHS should provide equivalent behavior:

- `isFtueDivePending`: true when neither the current FTUE completion key nor legacy completion key exists.
- `markFtueDiveComplete`: persist the current FTUE completion flag.
- `readTutorialSeenState`: return a partial tutorial seen map.
- `markTutorialHintSeen`: persist a hint as seen.

Keep persistence adapters outside `src/core`.

## Leaderboard

The current browser leaderboard is a fake local implementation behind `LeaderboardAdapter`. MHS can replace only the adapter while keeping `BrowserGameLoop`-equivalent flow:

1. Core emits `runEnded` with `catchCount`.
2. Platform submits the score.
3. Platform calls `setLeaderboardEntries(...)` with the latest snapshot.

If MHS leaderboard services are unavailable, keep the same fake fallback semantics for local testing.
