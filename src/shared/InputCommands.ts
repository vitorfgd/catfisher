export type UpgradeId = 'speargun' | 'haul' | 'oxygen';

export type GameInputCommand =
  | { type: 'tap'; x: number; y: number }
  | { type: 'divePress' }
  | { type: 'openUpgradePanel'; id: UpgradeId }
  | { type: 'buyUpgrade'; id: UpgradeId }
  | { type: 'buyConsumable'; id: 'net' | 'bait' }
  | { type: 'useConsumable'; id: 'net' | 'bait' };
