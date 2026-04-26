// @GUARD: Single gameplay RNG. Replace in tests (Vitest) with a fixed-seed Rng for determinism.

import { Rng } from './Rng';

let current: Rng = new Rng();

export function getGameRng(): Rng {
  return current;
}

/**
 * Use from tests only. Example: `setGameRngForTests(new Rng(1234))` before `update()`.
 * Does not need to be called from the browser build.
 */
export function setGameRngForTests(rng: Rng): void {
  current = rng;
}

export function createGameRng(seed?: number): Rng {
  return seed === undefined ? new Rng() : new Rng(seed);
}
