# Changes (excluding responsiveness)

This document describes edits that are **not** part of the canvas/viewport responsiveness work (letterboxing, `visualViewport`, dynamic `CANVAS_HEIGHT`, safe-area shell, etc.). If you revert responsiveness on a branch, keep or re-apply these separately as needed.

---

## 1. Post-dive leaderboard — “Tap anywhere to continue”

**What changed**

- Interstitial after a run: the dismiss line is **all caps**, **larger**, and **higher contrast** (white + `tb` stroke) so it reads over the dimmed backdrop.

**Files**

- [`src/render/RenderFrame.ts`](../src/render/RenderFrame.ts) — `drawBreachLeaderboardOverlay`

**How to reproduce**

1. Complete a dive and return until the **DIVE COMPLETE** leaderboard overlay appears.
2. Confirm the footer reads **`TAP ANYWHERE TO CONTINUE`** (not sentence case).
3. Confirm it looks clearly readable vs the older small muted label.

---

## 2. Shark FTUE bottom copy — placement

**What changed**

- The shark fight-back prompts (**“TAP TO FIGHT BACK”** / **“FINISH OFF THE SHARK!”**) were briefly moved **up** with extra bottom padding; that offset was **reverted** so vertical placement matches the **original** layout again.

**Files**

- [`src/render/RenderFrame.ts`](../src/render/RenderFrame.ts) — `drawFtueCtaOnly` (`bottomPad` no longer adds an extra `isFightBack` nudge).

**How to reproduce**

1. Start a fresh FTUE shark encounter (platform/storage must still treat first visit as FTUE dive, or equivalent bootstrap).
2. With the shark tableau and bottom gradient CTA visible, confirm the two-line block sits at the **original** vertical position (not lifted relative to design before the experimental nudge).

---

## 3. Hide combo / harpoon status / +O₂ during frozen beats

**What changed**

- While the **simulation is paused** for scripted FTUE or treasure payout, the HUD **does not show** stale:
  - **Combo** (“xN COMBO”),
  - **Puffer +O₂** burst (`+Ns O₂`),
  - **Spear lane** labels (**RELOADING / REELING / HAULING**).

**Files**

- [`src/core/GameLogic.ts`](../src/core/GameLogic.ts) — `shouldSuppressGameplayHudMessages`, wired in `getRenderState`
- [`src/render/RenderState.ts`](../src/render/RenderState.ts) — `suppressGameplayHudMessages: boolean`
- [`src/render/hud.ts`](../src/render/hud.ts) — `drawHud` gates the three blocks on that flag

**When suppression is active (matches “game stopped” in `update`)**

| Condition | Phase |
|-----------|--------|
| `treasureReveal != null` | `Action` — chest cinematic / payout |
| `ftueActive` and `ftue.stage === 'sharkEncounter'` | Until first resolving tap |
| `ftue.stage === 'firstFishCatch'` | Fish lesson with hand |
| `ftue.stage === 'firstTreasureIntro'` | Chest intro zoom |
| `ftue.stage === 'firstTreasureCatch'` | Tap-the-chest step |
| `ftue.oxygenLessonFishId != null` | Oxygen lesson fish |
| `ftue.stage === 'secondDiveConsumables'` and prompt `useBait` or `useNet` | Bait / net hand step |

**Not suppressed**

- **`useConsumables`** intro (both buttons highlighted): timers still advance; same pause path as bait/net **only** applies once prompt is **`useBait`** / **`useNet`**.

**How to reproduce**

1. **Fish FTUE:** Enter first-fish lesson; reel from a prior beat should **not** show REELING/HAULING; combo/+O₂ should stay hidden during the freeze.
2. **Treasure FTUE:** Run intro zoom and **catch treasure** step; confirm no stray combo/spear/+O₂ over the scripted UI.
3. **Any treasure chest reveal:** Trigger a mid-run treasure open; during `treasureReveal`, same three HUD strips should stay hidden.
4. **Shark FTUE:** On frozen shark tableau, spear lane text should not show if state still had LOAD/REEL/HAUL.
5. **Oxygen lesson:** While the lesson fish/script runs, combo/spear/+O₂ hidden.
6. **Second dive consumables:** On **`USE BAIT`** / **`USE NET`** with the tapping hand, those three HUD messages hidden; after prompt clears and sim runs, behavior returns to normal.

---

## Quick reference: files touched (non-responsiveness)

| Area | Path |
|------|------|
| Leaderboard footer | `src/render/RenderFrame.ts` |
| FTUE bottom CTA layout | `src/render/RenderFrame.ts` |
| Suppression flag | `src/core/GameLogic.ts`, `src/render/RenderState.ts` |
| HUD drawing | `src/render/hud.ts` |

---

## Responsiveness (intentionally omitted here)

Revert on git as planned; it typically includes:

- `src/main.ts` — container sizing, `ResizeObserver`, `visualViewport`, portrait full-bleed logical height
- `src/index.html` — `viewport-fit`, safe-area padding
- `src/core/Constants.ts` — dynamic `CANVAS_HEIGHT`, layout getters
- `src/core/FishSystem.ts`, `GameLogic.ts` player anchor
- `src/shared/UiLayout.ts`, `src/render/boatScreen.ts`, `src/render/hud.ts` layout helpers
- `src/render/Canvas2DRenderer.ts` — `setLogicalSize`
- `docs/MHS_PORTING.md` — browser vs MHS logical size notes

Re-applying **this doc’s** behaviors after reverting responsiveness: merge or cherry-pick the commits/hunks that only touch **`RenderFrame.ts`**, **`GameLogic.ts`** (`shouldSuppressGameplayHudMessages` + `getRenderState` field), **`RenderState.ts`**, and **`hud.ts`** (suppress flag usage), avoiding canvas/bootstrap/constants resize changes.
