import { afterEach, describe, expect, it } from 'vitest';
import { DIVE_TRANSITION, getMenuToGameDiveSegmentEnds, MENU_TO_GAME_DIVE_TOTAL_SEC } from './diveTransitionConfig';
import { OCEAN_BREACH_TOTAL_SEC, OCEAN_DIVE_TOTAL_SEC } from './Constants';
import { bootstrapActionFtueDive, createInitialState, drainEvents, update } from './GameLogic';
import { setGameRngForTests } from './GameRng';
import { Rng } from './Rng';
import { GamePhase } from './Types';

afterEach(() => {
  setGameRngForTests(new Rng());
});

describe('dive transition timing', () => {
  it('uses the overlap-aware segment total for exported dive duration', () => {
    const total = getMenuToGameDiveSegmentEnds().total;

    expect(MENU_TO_GAME_DIVE_TOTAL_SEC).toBe(total);
    expect(OCEAN_DIVE_TOTAL_SEC).toBe(total);
  });

  it('switches from Diving to Action at the exported dive duration', () => {
    const state = createInitialState();

    update(state, 0, [{ type: 'divePress' }]);
    expect(state.phase).toBe(GamePhase.Diving);

    update(state, OCEAN_DIVE_TOTAL_SEC - 0.001, []);
    expect(state.phase).toBe(GamePhase.Diving);

    update(state, 0.001, []);
    expect(state.phase).toBe(GamePhase.Action);
  });
});

describe('run finalization', () => {
  it('keeps last-run stats and clears live session stats on return to boat', () => {
    const state = createInitialState();
    state.phase = GamePhase.Breaching;
    state.breachLeaderboardDismissed = true;
    state.breachLeaderboardFadeElapsed = DIVE_TRANSITION.breachLeaderboardFadeDuration;
    state.breachTimer = OCEAN_BREACH_TOTAL_SEC - 0.01;
    state.sessionEarnings = 123;
    state.sessionCatchCount = 4;
    state.sessionTime = 12;

    update(state, 0.02, []);
    const runEnded = drainEvents(state).find((event) => event.type === 'runEnded');

    expect(state.phase).toBe(GamePhase.Boat);
    expect(state.lastRunEarnings).toBe(123);
    expect(state.lastRunCatchCount).toBe(4);
    expect(state.lastRunDurationSec).toBe(12);
    expect(state.sessionEarnings).toBe(0);
    expect(state.sessionCatchCount).toBe(0);
    expect(runEnded).toEqual({
      type: 'runEnded',
      earnings: 123,
      runDurationSec: 12,
      catchCount: 4,
    });
  });
});

describe('action pause semantics', () => {
  it('does not advance action-only VFX while the FTUE shark tableau is frozen', () => {
    const state = createInitialState();
    bootstrapActionFtueDive(state);
    state.netVfx = { elapsed: 0, catchesApplied: false };
    state.harpoonGunAnimElapsed = 0;

    update(state, 0.5, []);

    expect(state.phase).toBe(GamePhase.Action);
    expect(state.ftueActive).toBe(true);
    expect(state.sessionTime).toBe(0);
    expect(state.netVfx?.elapsed).toBe(0);
    expect(state.harpoonGunAnimElapsed).toBe(0);
  });
});
