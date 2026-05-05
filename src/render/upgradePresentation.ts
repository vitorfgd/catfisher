import type { UpgradeState } from '../core/Types';
import { AssetIds } from '../shared/AssetIds';
import { getUpgradePreviewStatLines } from '../shared/UpgradeBalance';

export const UPGRADE_LABELS: Record<keyof UpgradeState, string> = {
  speargun: 'SPEARGUN',
  haul: 'HAUL',
  oxygen: 'DIVE TIME',
};

/** One-line effect hint on the boat upgrade rows (replaces category kickers). */
export const UPGRADE_SUBTEXT: Record<keyof UpgradeState, string> = {
  speargun: 'Spear range, reload & cash per fish',
  haul: 'More money on every catch',
  oxygen: 'Longer dive before time runs out',
};

export const UPGRADE_LEVEL_NAMES: Record<keyof UpgradeState, string[]> = {
  speargun: ['Fishing Rod', 'Hand Spear', 'Speargun Mk.I', 'Pneumatic Gun'],
  haul: ['Small Bag', 'Fishing Bag', 'Fish Crate', 'Cargo Net'],
  oxygen: ['First Minute', 'Extra Stretch', 'Long Shift', 'Marathon Air'],
};

/** Gear card titles (no subtitle on gear). */
export const CONSUMABLE_NAMES: Record<'net' | 'bait', string> = {
  net: 'NET',
  bait: 'BAIT',
};

export const UPGRADE_LEVEL_SPRITES: Record<keyof UpgradeState, string[]> = {
  speargun: [AssetIds.upSpeargun1, AssetIds.upSpeargun2, AssetIds.upSpeargun3, AssetIds.upSpeargun4],
  haul: [AssetIds.upHaul1, AssetIds.upHaul2, AssetIds.upHaul3, AssetIds.upHaul4],
  oxygen: [AssetIds.upOxygen1, AssetIds.upOxygen2, AssetIds.upOxygen3, AssetIds.upOxygen4],
};

export function getUpgradeStatLines(id: keyof UpgradeState, level: number): string[] {
  return getUpgradePreviewStatLines(id, level);
}
