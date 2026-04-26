import type { UpgradeState } from '../core/Types';
import { AssetIds } from '../shared/AssetIds';
import { getUpgradePreviewStatLines } from '../shared/UpgradeBalance';

export const UPGRADE_LABELS: Record<keyof UpgradeState, string> = {
  speargun: 'SPEARGUN',
  haul: 'HAUL',
  oxygen: 'DIVE TIME',
};

export const UPGRADE_LEVEL_NAMES: Record<keyof UpgradeState, string[]> = {
  speargun: ['Fishing Rod', 'Hand Spear', 'Speargun Mk.I', 'Pneumatic Gun'],
  haul: ['Small Bag', 'Fishing Bag', 'Fish Crate', 'Cargo Net'],
  oxygen: ['First Minute', 'Extra Stretch', 'Long Shift', 'Marathon Air'],
};

/**
 * Gear cards: two-line block like upgrades (kicker 14/600, name 19/800) — short, no long descriptions.
 */
export const CONSUMABLE_LINES: Record<'net' | 'bait', { kicker: string; name: string }> = {
  net:  { kicker: 'CAST', name: 'NET' },
  bait: { kicker: 'LURE', name: 'BAIT' },
};

export const UPGRADE_LEVEL_SPRITES: Record<keyof UpgradeState, string[]> = {
  speargun: [AssetIds.upSpeargun1, AssetIds.upSpeargun2, AssetIds.upSpeargun3, AssetIds.upSpeargun4],
  haul: [AssetIds.upHaul1, AssetIds.upHaul2, AssetIds.upHaul3, AssetIds.upHaul4],
  oxygen: [AssetIds.upOxygen1, AssetIds.upOxygen2, AssetIds.upOxygen3, AssetIds.upOxygen4],
};

export function getUpgradeStatLines(id: keyof UpgradeState, level: number): string[] {
  return getUpgradePreviewStatLines(id, level);
}
