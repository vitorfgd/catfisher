export type UpgradeId = 'speargun' | 'haul' | 'oxygen';

export type GameInputCommand =
  | { type: 'tap'; x: number; y: number }
  | { type: 'divePress' }
  | { type: 'openBoatLeaderboard' }
  | { type: 'closeBoatLeaderboard' }
  | { type: 'openUpgradePanel'; id: UpgradeId }
  | { type: 'buyUpgrade'; id: UpgradeId }
  | { type: 'buyConsumable'; id: 'net' | 'bait' }
  | { type: 'useConsumable'; id: 'net' | 'bait' }
  /** Breach end summary: first tap skips staged counts; second tap returns to boat. */
  | { type: 'breachEndScreenTap' }
  | { type: 'confirmBreachToBoat' };
