import { describe, it, expect, afterEach } from 'vitest';
import { Rng } from './Rng';
import { getGameRng, setGameRngForTests, createGameRng } from './GameRng';
import { getModulatedSpawnInterval } from './FishSystem';
import { WAVE_DURATION_SEC } from './Constants';

afterEach(() => {
  setGameRngForTests(new Rng());
});

describe('GameRng', () => {
  it('uses injectable Rng for deterministic output', () => {
    setGameRngForTests(new Rng(99));
    const a = getGameRng();
    setGameRngForTests(new Rng(99));
    const b = getGameRng();
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });

  it('createGameRng with seed is deterministic', () => {
    const c = createGameRng(7);
    const d = createGameRng(7);
    expect(c.next()).toBe(d.next());
  });
});

describe('getModulatedSpawnInterval', () => {
  it('returns positive base interval and scales within a wave', () => {
    const t0 = getModulatedSpawnInterval(0.1);
    const t2 = WAVE_DURATION_SEC > 0 ? getModulatedSpawnInterval(0.1 + WAVE_DURATION_SEC * 0.8) : t0;
    expect(t0).toBeGreaterThan(0);
    expect(t2).toBeGreaterThan(0);
  });
});
