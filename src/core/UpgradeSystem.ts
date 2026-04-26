import type { UpgradeState } from './Types';
import {
  UPGRADE_COSTS,
  UPGRADE_MAX_LEVEL,
} from './Constants';
import {
  getHaulValueMultiplier,
  getOxygenMaxSeconds,
  getSpeargunRangePx,
  getSpeargunReelSpeedPxPerSec,
  getSpeargunShootCooldownSec,
  getSpeargunValueMultiplier,
} from '../shared/UpgradeBalance';

export function getUpgradeCost(id: keyof UpgradeState, currentLevel: number): number {
  if (currentLevel >= UPGRADE_MAX_LEVEL) return Infinity;
  return UPGRADE_COSTS[id]?.[currentLevel - 1] ?? Infinity;
}

export function canAffordUpgrade(money: number, id: keyof UpgradeState, level: number): boolean {
  return money >= getUpgradeCost(id, level);
}

// Speargun — combines old spearPower + fireRate
export function getSpearMaxDistance(upgrades: UpgradeState): number {
  return getSpeargunRangePx(upgrades.speargun);
}

export function getShootCooldown(upgrades: UpgradeState): number {
  return getSpeargunShootCooldownSec(upgrades.speargun);
}

export function getReelSpeed(upgrades: UpgradeState): number {
  return getSpeargunReelSpeedPxPerSec(upgrades.speargun);
}

export function getValueMultiplier(upgrades: UpgradeState): number {
  return getSpeargunValueMultiplier(upgrades.speargun);
}

// Haul — earnings multiplier (was reward)
export function getHaulMultiplier(upgrades: UpgradeState): number {
  return getHaulValueMultiplier(upgrades.haul);
}

// Oxygen
export function getMaxOxygen(upgrades: UpgradeState): number {
  return getOxygenMaxSeconds(upgrades.oxygen);
}

export function getAllUpgradeCosts(upgrades: UpgradeState): Record<keyof UpgradeState, number> {
  return {
    speargun: getUpgradeCost('speargun', upgrades.speargun),
    haul:     getUpgradeCost('haul',     upgrades.haul),
    oxygen:   getUpgradeCost('oxygen',   upgrades.oxygen),
  };
}

export function getCanAffordAll(
  money: number,
  upgrades: UpgradeState,
): Record<keyof UpgradeState, boolean> {
  return {
    speargun: canAffordUpgrade(money, 'speargun', upgrades.speargun),
    haul:     canAffordUpgrade(money, 'haul',     upgrades.haul),
    oxygen:   canAffordUpgrade(money, 'oxygen',   upgrades.oxygen),
  };
}
