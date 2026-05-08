import { afterEach, describe, expect, it } from 'vitest';
import {
  DIVE_TRANSITION,
  GO_FISH_SPLASH_DELAY_MS,
  getMenuToGameDiveSegmentEnds,
  MENU_TO_GAME_DIVE_TOTAL_SEC,
} from './diveTransitionConfig';
import { BASE_SPEAR_MAX_DISTANCE, OCEAN_BREACH_TOTAL_SEC, OCEAN_DIVE_TOTAL_SEC, PLAYER_X, PLAYER_Y } from './Constants';
import { bootstrapActionFtueDive, createInitialState, drainEvents, update } from './GameLogic';
import { setGameRngForTests } from './GameRng';
import { Rng } from './Rng';
import { FishType, GamePhase } from './Types';
import { BrowserFakeLeaderboardAdapter } from '../platform/LeaderboardAdapter';

afterEach(() => {
  setGameRngForTests(new Rng());
  delete (globalThis as { localStorage?: Storage }).localStorage;
});

function installMemoryLocalStorage(): void {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } as Storage;
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
  });
}

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

  it('emits the diver splash once on each dive at the authored splash timing', () => {
    const state = createInitialState();
    const splashDelaySec = GO_FISH_SPLASH_DELAY_MS / 1000;

    update(state, 0, [{ type: 'divePress' }]);
    drainEvents(state);
    update(state, splashDelaySec - 0.001, []);
    expect(drainEvents(state).some((event) => event.type === 'diverSplash')).toBe(false);
    update(state, 0.001, []);
    expect(drainEvents(state).filter((event) => event.type === 'diverSplash')).toHaveLength(1);

    update(state, OCEAN_DIVE_TOTAL_SEC, []);
    state.phase = GamePhase.Boat;

    update(state, 0, [{ type: 'divePress' }]);
    drainEvents(state);
    update(state, splashDelaySec, []);
    expect(drainEvents(state).filter((event) => event.type === 'diverSplash')).toHaveLength(1);
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

describe('run stats aggregation', () => {
  it('persists best run money and all-time fish caught', () => {
    installMemoryLocalStorage();
    const leaderboard = new BrowserFakeLeaderboardAdapter();

    leaderboard.submitFishCaught(4, 120);
    const snapshot = leaderboard.submitFishCaught(2, 200);

    expect(snapshot.bestFishCaught).toBe(4);
    expect(snapshot.bestRunMoney).toBe(200);
    expect(snapshot.bestRunFishCaught).toBe(2);
    expect(snapshot.allTimeFishCaught).toBe(6);
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

  it('tap to dismiss frozen shark FTUE fires a spear the same frame', () => {
    const state = createInitialState();
    bootstrapActionFtueDive(state);
    expect(state.ftueActive).toBe(true);
    expect(state.spears.length).toBe(0);

    update(state, 0, [{ type: 'tap', x: 240, y: 400 }]);

    expect(state.ftueActive).toBe(false);
    expect(state.spears.length).toBe(1);
    expect(drainEvents(state).some((e) => e.type === 'spearFired')).toBe(true);
  });
});

describe('ftue progression', () => {
  it('introduces a fish-catching lesson before treasure', () => {
    const state = createInitialState();
    state.phase = GamePhase.Action;
    state.roundTimeMax = 100;
    state.roundTimeLeft = 100;
    state.ftue.stage = 'firstFishIntro';
    state.fishSpawnTimer = 8_000_000_000_000;
    state.treasureSpawnTimer = 8_000_000_000_000;
    state.bossSpawnTimer = 8_000_000_000_000;
    state.fish.push({
      id: state.nextFishId++,
      x: 240,
      y: 360,
      vx: 50,
      vy: 0,
      wanderTimer: 2,
      age: 0,
      hasAttacked: false,
      type: FishType.Small,
      alive: true,
      hitFlash: 0,
    });

    update(state, 2.01, []);

    expect(state.ftue.stage).toBe('firstFishCatch');
    expect(state.ftue.prompt).toBe('catchFish');
    const target = state.fish.find((fish) => fish.type === FishType.Small && fish.ftueShowcase);
    expect(target).toBeDefined();
    expect(Math.hypot(target!.x - PLAYER_X, target!.y - PLAYER_Y)).toBeLessThan(BASE_SPEAR_MAX_DISTANCE);
  });

  it('spawns a catchable O2 fish lesson when the tank reaches yellow', () => {
    const state = createInitialState();
    state.phase = GamePhase.Action;
    state.roundTimeMax = 100;
    state.roundTimeLeft = 50;
    state.fishSpawnTimer = 8_000_000_000_000;
    state.treasureSpawnTimer = 8_000_000_000_000;
    state.bossSpawnTimer = 8_000_000_000_000;

    update(state, 0.01, []);

    expect(state.ftue.oxygenLessonShown).toBe(true);
    expect(state.ftue.oxygenLessonFishId).not.toBeNull();
    expect(state.ftue.prompt).toBe(null);

    update(state, 2, []);

    const lessonFish = state.fish.find((fish) => fish.id === state.ftue.oxygenLessonFishId);
    expect(lessonFish?.type).toBe(FishType.Puffer);
    expect(state.ftue.prompt).toBe('oxygenLimit');

    const pausedTimeLeft = state.roundTimeLeft;
    update(state, 1, []);

    expect(state.roundTimeLeft).toBe(pausedTimeLeft);

    update(state, 0, [{ type: 'tap', x: 240, y: 620 }]);
    for (let i = 0; i < 80 && state.ftue.oxygenLessonFishId != null; i += 1) {
      update(state, 0.05, []);
    }

    expect(state.ftue.oxygenLessonFishId).toBe(null);
    expect(state.ftue.prompt).toBe(null);
  });

  it('teaches bait before net and pauses while waiting for each tap', () => {
    const state = createInitialState();
    state.ftue.stage = 'secondDiveConsumables';

    update(state, 0, [{ type: 'divePress' }]);
    update(state, OCEAN_DIVE_TOTAL_SEC, []);

    expect(state.phase).toBe(GamePhase.Action);
    expect(state.ftue.prompt).toBe(null);
    expect(state.consumables.bait).toBeGreaterThan(0);
    expect(state.consumables.net).toBeGreaterThan(0);

    const baitStock = state.consumables.bait;
    const netStock = state.consumables.net;
    update(state, 0, [{ type: 'useConsumable', id: 'bait' }]);
    update(state, 0, [{ type: 'useConsumable', id: 'net' }]);

    expect(state.consumables.bait).toBe(baitStock);
    expect(state.consumables.net).toBe(netStock);
    expect(state.ftue.prompt).toBe(null);

    update(state, 1, []);

    const timeLeftAfterFirstSecond = state.roundTimeLeft;
    expect(state.ftue.prompt).toBe(null);

    update(state, 1.1, []);

    expect(state.roundTimeLeft).toBeLessThan(timeLeftAfterFirstSecond);
    expect(state.ftue.prompt).toBe('useBait');

    const timeLeftAtBaitPrompt = state.roundTimeLeft;
    update(state, 1, []);

    expect(state.roundTimeLeft).toBe(timeLeftAtBaitPrompt);

    update(state, 0, [{ type: 'useConsumable', id: 'net' }]);

    expect(state.ftue.prompt).toBe('useBait');
    expect(state.consumables.net).toBeGreaterThan(0);

    update(state, 0, [{ type: 'useConsumable', id: 'bait' }]);

    expect(state.ftue.prompt).toBe(null);
    expect(state.ftue.usedBait).toBe(true);

    const netStockBeforePrompt = state.consumables.net;
    update(state, 0, [{ type: 'useConsumable', id: 'net' }]);

    expect(state.consumables.net).toBe(netStockBeforePrompt);
    expect(state.ftue.prompt).toBe(null);

    const timeLeftAfterBait = state.roundTimeLeft;
    update(state, 1, []);

    expect(state.roundTimeLeft).toBeLessThan(timeLeftAfterBait);
    expect(state.ftue.prompt).toBe(null);

    update(state, 1.1, []);

    expect(state.ftue.prompt).toBe('useNet');

    const timeLeftAtNetPrompt = state.roundTimeLeft;
    update(state, 1, []);

    expect(state.roundTimeLeft).toBe(timeLeftAtNetPrompt);

    update(state, 0, [{ type: 'useConsumable', id: 'net' }]);

    expect(state.ftue.stage).toBe('complete');
    expect(state.ftue.prompt).toBe(null);
    expect(state.ftue.usedNet).toBe(true);
  });
});
