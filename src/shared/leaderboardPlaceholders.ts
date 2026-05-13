import type { LeaderboardEntry } from '../core/Types';

/** Nine NPC rows merged with `YOU` for a 10-slot fake leaderboard (`rank` filled by `ranked()`). */
export const LEADERBOARD_PLACEHOLDER_NPCS: LeaderboardEntry[] = [
  { rank: 0, name: 'Kelp', fishCaught: 94 },
  { rank: 0, name: 'Brine', fishCaught: 88 },
  { rank: 0, name: 'Gunnel', fishCaught: 81 },
  { rank: 0, name: 'Tackle', fishCaught: 76 },
  { rank: 0, name: 'Reef', fishCaught: 69 },
  { rank: 0, name: 'Sonar', fishCaught: 62 },
  { rank: 0, name: 'Hull', fishCaught: 54 },
  { rank: 0, name: 'Wake', fishCaught: 47 },
  { rank: 0, name: 'Chart', fishCaught: 38 },
];
