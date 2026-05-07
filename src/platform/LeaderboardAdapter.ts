// Platform-agnostic leaderboard contract with a browser fake implementation.

import type { LeaderboardEntry, LeaderboardState } from '../core/Types';

export interface LeaderboardAdapter {
  getFishCaughtLeaderboard(): LeaderboardState;
  submitFishCaught(score: number, runMoney?: number): LeaderboardState;
}

const LEADERBOARD_KEY = 'grumpiest_catch_fish_caught_leaderboard_v1';

const FAKE_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, name: 'Mara', fishCaught: 42 },
  { rank: 2, name: 'Skiff', fishCaught: 35 },
  { rank: 3, name: 'Pip', fishCaught: 22 },
  { rank: 4, name: 'Nori', fishCaught: 18 },
];

function ranked(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries
    .sort((a, b) => b.fishCaught - a.fishCaught)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export class BrowserFakeLeaderboardAdapter implements LeaderboardAdapter {
  getFishCaughtLeaderboard(): LeaderboardState {
    const best = this.readBest();
    const last = this.readLast();
    return {
      bestFishCaught: best,
      lastSubmittedFishCaught: last,
      bestRunMoney: this.readNumber('bestRunMoney'),
      bestRunFishCaught: this.readNumber('bestRunFishCaught'),
      allTimeFishCaught: this.readNumber('allTimeFishCaught'),
      entries: this.buildEntries(best),
    };
  }

  submitFishCaught(score: number, runMoney = 0): LeaderboardState {
    const nextScore = Math.max(0, Math.floor(score));
    const nextMoney = Math.max(0, Math.floor(runMoney));
    const best = Math.max(this.readBest(), nextScore);
    const currentBestRunMoney = this.readNumber('bestRunMoney');
    const currentBestRunFishCaught = this.readNumber('bestRunFishCaught');
    const isBestMoneyRun = nextMoney > currentBestRunMoney;
    const bestRunMoney = isBestMoneyRun ? nextMoney : currentBestRunMoney;
    const bestRunFishCaught = isBestMoneyRun ? nextScore : currentBestRunFishCaught;
    const allTimeFishCaught = this.readNumber('allTimeFishCaught') + nextScore;
    this.write(best, nextScore, bestRunMoney, bestRunFishCaught, allTimeFishCaught);
    return {
      bestFishCaught: best,
      lastSubmittedFishCaught: nextScore,
      bestRunMoney,
      bestRunFishCaught,
      allTimeFishCaught,
      entries: this.buildEntries(best),
    };
  }

  private buildEntries(bestFishCaught: number): LeaderboardEntry[] {
    const player: LeaderboardEntry = {
      rank: 0,
      name: 'YOU',
      fishCaught: bestFishCaught,
      isPlayer: true,
    };
    return ranked([...FAKE_ENTRIES, player]).slice(0, 5);
  }

  private readBest(): number {
    return this.readNumber('best');
  }

  private readLast(): number {
    return this.readNumber('last');
  }

  private readNumber(
    field: 'best' | 'last' | 'bestRunMoney' | 'bestRunFishCaught' | 'allTimeFishCaught',
  ): number {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as Partial<Record<
        'best' | 'last' | 'bestRunMoney' | 'bestRunFishCaught' | 'allTimeFishCaught',
        number
      >>;
      return Math.max(0, Math.floor(parsed[field] ?? 0));
    } catch {
      return 0;
    }
  }

  private write(
    best: number,
    last: number,
    bestRunMoney: number,
    bestRunFishCaught: number,
    allTimeFishCaught: number,
  ): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify({
        best,
        last,
        bestRunMoney,
        bestRunFishCaught,
        allTimeFishCaught,
      }));
    } catch {
      /* private mode, etc. */
    }
  }
}
