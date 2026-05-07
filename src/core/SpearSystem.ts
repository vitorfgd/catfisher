import type { FishState, FishType, PlayerState, SpearState } from './Types';
import { SpearMode } from './Types';
import { HARPOON_GUN_DRAW_H, SPEAR_SPEED } from './Constants';
import { getFishHitbox } from './FishSystem';

/** Bottom-centre grip / turret anchor in world space (`PLAYER_X`, `PLAYER_Y`). */
export function getHarpoonGripWorld(playerX: number, playerY: number): { x: number; y: number } {
  return { x: playerX, y: playerY };
}

/** World-space muzzle (top-centre of `gun_1` art) when the grip is at `(gripX, gripY)` and the barrel follows `aimAngle`. */
export function getHarpoonMuzzleWorldFromGrip(
  gripX: number,
  gripY: number,
  aimAngle: number,
): { x: number; y: number } {
  const drawH = HARPOON_GUN_DRAW_H;
  return {
    x: gripX + Math.cos(aimAngle) * drawH,
    y: gripY + Math.sin(aimAngle) * drawH,
  };
}

export interface DeliveredCatch {
  spearId: number;
  x: number;
  y: number;
  fishType: FishType;
  value: number;
  ftueShowcase: boolean;
}

export function fireSpear(
  id: number,
  player: PlayerState,
  aimAngle: number,
  maxDistance: number,
): SpearState {
  const muzzle = getHarpoonMuzzleWorldFromGrip(player.x, player.y, aimAngle);
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
    caughtFishWasFtueShowcase: false,
    caughtFishStartDistance: 0,
    catchValue: 0,
    done: false,
  };
}

export function attachCatchToSpear(
  spear: SpearState,
  fishType: FishType,
  catchValue: number,
  ftueShowcase = false,
): void {
  spear.mode = SpearMode.Returning;
  spear.caughtFishType = fishType;
  spear.caughtFishWasFtueShowcase = ftueShowcase;
  spear.caughtFishStartDistance = Math.max(1, spear.distanceTravelled);
  spear.catchValue = catchValue;
}

/** Partial hit (e.g. armored boss) — spear returns empty so the player can shoot again. */
export function returnSpearWithoutCatch(spear: SpearState): void {
  spear.mode = SpearMode.Returning;
  spear.caughtFishType = null;
  spear.caughtFishWasFtueShowcase = false;
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
      const { x: targetX, y: targetY } = getHarpoonMuzzleWorldFromGrip(player.x, player.y, player.aimAngle);
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
            ftueShowcase: spear.caughtFishWasFtueShowcase,
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
