// Mulberry32 — fast, seedable 32-bit RNG. No browser/platform deps.
export class Rng {
  private state: number;

  constructor(seed = Date.now()) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let z = this.state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = (z ^ (z >>> 14)) >>> 0;
    return z / 0x100000000;
  }

  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intBetween(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1));
  }

  // Weighted pick: weights is array of relative weights, returns chosen index
  weightedIndex(weights: number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }
}
