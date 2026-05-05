import type { FishState, FishType, PlayerState, SpearState } from './Types';
import { SpearMode } from './Types';
import { SPEAR_SPEED } from './Constants';
import { getFishHitbox } from './FishSystem';

/** First-person tether origin: bottom-center of the action view. */
export function getTurretMuzzleWorld(playerX: number, playerY: number): { x: number; y: number } {
  return { x: playerX, y: playerY };
}

export interface DeliveredCatch {
  spearId: number;
  x: number;
  y: number;
  fishType: FishType;
  value: number;
}

export function fireSpear(
  id: number,
  player: PlayerState,
  aimAngle: number,
  maxDistance: number,
): SpearState {
  const muzzle = getTurretMuzzleWorld(player.x, player.y);
  return {
    id,
    x: muzzle.x,
    y: muzzle.y,
    vx: Math.cos(aimAngle) * SPEAR_SPEED,
    vy: Math.sin(aimAngle) * SPEAR_SPEED,
    fireAngle: aimAngle,
    distanceTravelled: 0,
    maxDistance,
    mode: SpearMode.Outbound,
    caughtFishType: null,
    caughtFishStartDistance: 0,
    catchValue: 0,
    done: false,
  };
}

export function attachCatchToSpear(
  spear: SpearState,
  fishType: FishType,
  catchValue: number,
): void {
  spear.mode = SpearMode.Returning;
  spear.caughtFishType = fishType;
  spear.caughtFishStartDistance = Math.max(1, spear.distanceTravelled);
  spear.catchValue = catchValue;
}

/** Partial hit (e.g. armored boss) — spear returns empty so the player can shoot again. */
export function returnSpearWithoutCatch(spear: SpearState): void {
  spear.mode = SpearMode.Returning;
  spear.caughtFishType = null;
  spear.caughtFishStartDistance = 0;
  spear.catchValue = 0;
}

export function updateSpears(
  spears: SpearState[],
  player: PlayerState,
  dt: number,
  returnSpeed: number,
): DeliveredCatch[] {
  const delivered: DeliveredCatch[] = [];

  for (const spear of spears) {
    if (spear.done) continue;

    if (spear.mode === SpearMode.Outbound) {
      spear.x += spear.vx * dt;
      spear.y += spear.vy * dt;
      spear.distanceTravelled += SPEAR_SPEED * dt;

      if (spear.distanceTravelled >= spear.maxDistance) {
        spear.mode = SpearMode.Returning;
      }
    }

    if (spear.mode === SpearMode.Returning) {
      const { x: targetX, y: targetY } = getTurretMuzzleWorld(player.x, player.y);
      const dx = targetX - spear.x;
      const dy = targetY - spear.y;
      const dist = Math.hypot(dx, dy);
      const speed = spear.caughtFishType === null ? returnSpeed * 1.05 : returnSpeed;

      if (dist <= speed * dt || dist < 1) {
        spear.x = targetX;
        spear.y = targetY;
        spear.done = true;

        if (spear.caughtFishType !== null) {
          delivered.push({
            spearId: spear.id,
            x: targetX,
            y: targetY,
            fishType: spear.caughtFishType,
            value: spear.catchValue,
          });
        }
        continue;
      }

      spear.vx = (dx / dist) * speed;
      spear.vy = (dy / dist) * speed;
      spear.x += spear.vx * dt;
      spear.y += spear.vy * dt;
    }
  }

  return delivered;
}

export function removeResolvedSpears(spears: SpearState[]): SpearState[] {
  return spears.filter((spear) => !spear.done);
}

export function detectSpearFishCollisions(
  spears: SpearState[],
  fish: FishState[],
): Array<{ spearId: number; fishId: number }> {
  const hits: Array<{ spearId: number; fishId: number }> = [];
  const spearRadius = 10;

  for (const spear of spears) {
    if (spear.mode !== SpearMode.Outbound || spear.caughtFishType !== null) continue;

    for (const currentFish of fish) {
      if (!currentFish.alive) continue;
      const { x, y, hw, hh } = getFishHitbox(currentFish);

      if (
        spear.x >= x - hw - spearRadius &&
        spear.x <= x + hw + spearRadius &&
        spear.y >= y - hh - spearRadius &&
        spear.y <= y + hh + spearRadius
      ) {
        hits.push({ spearId: spear.id, fishId: currentFish.id });
      }
    }
  }

  return hits;
}
