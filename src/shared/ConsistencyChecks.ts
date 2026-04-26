import { UPGRADE_MAX_LEVEL } from '../core/Constants';
import {
  getHaulValueMultiplier,
  getOxygenMaxSeconds,
  getSpeargunRangePx,
  getSpeargunReelSpeedPxPerSec,
  getSpeargunShootCooldownSec,
  getSpeargunValueMultiplier,
} from './UpgradeBalance';
import { HUD_CONSUMABLE_BUTTON_HIT_RADIUS, HUD_CONSUMABLE_BUTTON_RADIUS } from './UiLayout';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[consistency] ${message}`);
}

function checkUpgradeMathInvariants(): void {
  let previousRange = 0;
  let previousCooldown = Number.POSITIVE_INFINITY;
  let previousReel = 0;
  let previousValue = 0;
  let previousHaul = 0;
  let previousOxygen = 0;

  for (let level = 1; level <= UPGRADE_MAX_LEVEL; level += 1) {
    const range = getSpeargunRangePx(level);
    const cooldown = getSpeargunShootCooldownSec(level);
    const reel = getSpeargunReelSpeedPxPerSec(level);
    const value = getSpeargunValueMultiplier(level);
    const haul = getHaulValueMultiplier(level);
    const oxygen = getOxygenMaxSeconds(level);

    assert(range >= previousRange, `Speargun range regressed at level ${level}.`);
    assert(cooldown <= previousCooldown, `Speargun fire-rate regressed at level ${level}.`);
    assert(reel >= previousReel, `Reel speed regressed at level ${level}.`);
    assert(value >= previousValue, `Speargun value multiplier regressed at level ${level}.`);
    assert(haul >= previousHaul, `Haul multiplier regressed at level ${level}.`);
    assert(oxygen >= previousOxygen, `Dive time regressed at level ${level}.`);

    previousRange = range;
    previousCooldown = cooldown;
    previousReel = reel;
    previousValue = value;
    previousHaul = haul;
    previousOxygen = oxygen;
  }
}

function checkUiInvariants(): void {
  assert(
    HUD_CONSUMABLE_BUTTON_HIT_RADIUS >= HUD_CONSUMABLE_BUTTON_RADIUS,
    'Consumable hit radius must be >= visual radius.',
  );
}

export function runConsistencyChecks(): void {
  checkUpgradeMathInvariants();
  checkUiInvariants();
}
