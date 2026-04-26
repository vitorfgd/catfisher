import type { UpgradeState } from '../core/Types';
import {
  BASE_OXYGEN,
  BASE_SHOOT_COOLDOWN,
  BASE_SPEAR_MAX_DISTANCE,
  OXYGEN_PER_LEVEL,
  SHOOT_COOLDOWN_REDUCTION,
  SPEAR_RANGE_PER_LEVEL,
  SPEAR_RETURN_SPEED,
  UPGRADE_MAX_LEVEL,
} from '../core/Constants';

function levelSteps(level: number): number {
  return Math.max(0, Math.min(UPGRADE_MAX_LEVEL, level) - 1);
}

export function getSpeargunRangePx(level: number): number {
  return BASE_SPEAR_MAX_DISTANCE + SPEAR_RANGE_PER_LEVEL * levelSteps(level);
}

export function getSpeargunShootCooldownSec(level: number): number {
  return Math.max(0.14, BASE_SHOOT_COOLDOWN - SHOOT_COOLDOWN_REDUCTION * levelSteps(level));
}

export function getSpeargunReelSpeedPxPerSec(level: number): number {
  return SPEAR_RETURN_SPEED + 80 * levelSteps(level);
}

export function getSpeargunValueMultiplier(level: number): number {
  return 1 + 0.25 * levelSteps(level);
}

export function getHaulValueMultiplier(level: number): number {
  return 1 + 0.30 * levelSteps(level);
}

export function getOxygenMaxSeconds(level: number): number {
  return BASE_OXYGEN + OXYGEN_PER_LEVEL * levelSteps(level);
}

export function getUpgradePreviewStatLines(id: keyof UpgradeState, level: number): string[] {
  const clamped = Math.max(1, Math.min(UPGRADE_MAX_LEVEL, level));
  const rangeMeters = (getSpeargunRangePx(clamped) / 10).toFixed(1);
  const reelMetersPerSec = (getSpeargunReelSpeedPxPerSec(clamped) / 10).toFixed(1);
  switch (id) {
    case 'speargun':
      return [
        `Range ${rangeMeters} m`,
        `Fire rate ${getSpeargunShootCooldownSec(clamped).toFixed(2)} s`,
        `Fish value ×${getSpeargunValueMultiplier(clamped).toFixed(2)}`,
        `Reel speed ${reelMetersPerSec} m/s`,
      ];
    case 'haul':
      return [
        `Earnings ×${getHaulValueMultiplier(clamped).toFixed(2)}`,
        'Applies to every catch including treasure chests',
      ];
    case 'oxygen':
      return [`Max dive time  ${getOxygenMaxSeconds(clamped)}s`];
  }
}
