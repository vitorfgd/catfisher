import type { FishState } from './Types';
import { FishType } from './Types';
import type { Rng } from './Rng';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FISH_HITBOX_H,
  FISH_HITBOX_W,
  FISH_OFFSCREEN_MARGIN,
  FISH_SPEEDS_MAX,
  FISH_SPEEDS_MIN,
  FISH_SPAWN_TIME_SCALE,
  RARE_FISH_MIN_SESSION_TIME,
  FISH_SPAWN_WEIGHTS,
  FISH_VALUE_MAX,
  FISH_VALUE_MIN,
  FISH_Y_MAX_FRAC,
  FISH_Y_MIN_FRAC,
  BASE_FISH_SPAWN_INTERVAL,
  MIN_FISH_SPAWN_INTERVAL,
  BOSS_FISH_MAX_HP,
} from './Constants';

const Y_MIN = CANVAS_HEIGHT * FISH_Y_MIN_FRAC;
const Y_MAX = CANVAS_HEIGHT * FISH_Y_MAX_FRAC;
const Y_SOFT_MIN = Y_MIN - 20;
const Y_SOFT_MAX = Y_MAX + 20;

export function pickFishType(rng: Rng): FishType {
  return rng.weightedIndex(FISH_SPAWN_WEIGHTS) as FishType;
}

export function spawnFish(id: number, rng: Rng, sessionTime: number): FishState {
  const rawType = pickFishType(rng);
  const type = rawType === FishType.Rare && sessionTime < RARE_FISH_MIN_SESSION_TIME
    ? FishType.Medium
    : rawType;
  const speed = rng.between(FISH_SPEEDS_MIN[type], FISH_SPEEDS_MAX[type]);

  let x: number, y: number, vx: number, vy: number;

  if (type === FishType.Jelly) {
    // Jellyfish: spawn top/bottom, drift vertically with slow horizontal wobble
    const fromTop = rng.next() < 0.65;
    x = rng.between(CANVAS_WIDTH * 0.1, CANVAS_WIDTH * 0.9);
    y = fromTop ? Y_MIN - FISH_OFFSCREEN_MARGIN : CANVAS_HEIGHT + FISH_OFFSCREEN_MARGIN;
    vx = (rng.next() - 0.5) * speed * 0.25;
    vy = fromTop ? speed : -speed;
  } else {
    // All other fish: weighted spawn from any edge (mostly left/right)
    const roll = rng.next();
    if (roll < 0.38) {
      // from left
      const ang = rng.between(-Math.PI * 0.28, Math.PI * 0.28);
      x = -FISH_OFFSCREEN_MARGIN;
      y = rng.between(Y_MIN, Y_MAX);
      vx = Math.cos(ang) * speed;
      vy = Math.sin(ang) * speed;
    } else if (roll < 0.76) {
      // from right
      const ang = rng.between(Math.PI * 0.72, Math.PI * 1.28);
      x = CANVAS_WIDTH + FISH_OFFSCREEN_MARGIN;
      y = rng.between(Y_MIN, Y_MAX);
      vx = Math.cos(ang) * speed;
      vy = Math.sin(ang) * speed;
    } else if (roll < 0.88) {
      // from top
      const ang = rng.between(Math.PI * 0.28, Math.PI * 0.72);
      x = rng.between(CANVAS_WIDTH * 0.1, CANVAS_WIDTH * 0.9);
      y = Y_MIN - FISH_OFFSCREEN_MARGIN;
      vx = Math.cos(ang) * speed;
      vy = Math.sin(ang) * speed;
    } else {
      // from bottom
      const ang = rng.between(-Math.PI * 0.72, -Math.PI * 0.28);
      x = rng.between(CANVAS_WIDTH * 0.1, CANVAS_WIDTH * 0.9);
      y = Y_MAX + FISH_OFFSCREEN_MARGIN;
      vx = Math.cos(ang) * speed;
      vy = Math.sin(ang) * speed;
    }
  }

  return {
    id, x, y, vx, vy,
    wanderTimer: rng.between(1.4, 3.8),
    age: 0,
    hasAttacked: false,
    type,
    alive: true,
    hitFlash: 0,
  };
}

export function updateFish(
  fish: FishState[],
  dt: number,
  rng: Rng,
  baitX: number | null,
  baitY: number | null,
): void {
  for (const f of fish) {
    if (!f.alive) continue;

    f.age += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    if (baitX !== null && baitY !== null) {
      const dx = baitX - f.x;
      const dy = baitY - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      if (dist < 55) {
        // Close to bait — orbit tangentially so fish swarm in a circle
        const tangX = -dy / dist;
        const tangY =  dx / dist;
        f.vx = f.vx * 0.88 + tangX * 180 * dt;
        f.vy = f.vy * 0.88 + tangY * 180 * dt;
      } else {
        // Far — strong attraction toward bait
        const pull = 260 / dist;
        f.vx += (dx / dist) * pull * dt;
        f.vy += (dy / dist) * pull * dt;
      }
      const spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      const maxSpd = FISH_SPEEDS_MAX[f.type] * 1.6;
      if (spd > maxSpd) { f.vx *= maxSpd / spd; f.vy *= maxSpd / spd; }
    } else if (f.type === FishType.Jelly) {
      // Jellyfish: dampen horizontal, add slight random wobble
      f.vx *= 1 - dt * 1.2;
      f.vx += (rng.next() - 0.5) * 18 * dt;
      // Reverse vertical when exiting soft boundaries
      if (f.y < Y_SOFT_MIN && f.vy < 0) f.vy = Math.abs(f.vy) * 0.7;
      if (f.y > Y_SOFT_MAX && f.vy > 0) f.vy = -Math.abs(f.vy) * 0.7;
    } else {
      // Wander for all other types
      f.wanderTimer -= dt;
      if (f.wanderTimer <= 0) {
        const spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || FISH_SPEEDS_MIN[f.type];
        const curAng = Math.atan2(f.vy, f.vx);
        // Sharks turn less sharply; small fish are more erratic
        const maxTurn = f.type === FishType.Large || f.type === FishType.Boss
          ? Math.PI * 0.35
          : Math.PI * 0.45;
        const turn = (rng.next() - 0.5) * maxTurn;
        const newAng = curAng + turn;
        // Sharks also get random speed bursts
        const speedScale = f.type === FishType.Large || f.type === FishType.Boss
          ? (0.8 + rng.next() * 0.6)
          : 1;
        f.vx = Math.cos(newAng) * spd * speedScale;
        f.vy = Math.sin(newAng) * spd * speedScale;
        // Cap speed
        const newSpd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        const maxS = FISH_SPEEDS_MAX[f.type] * 1.4;
        if (newSpd > maxS) { f.vx *= maxS / newSpd; f.vy *= maxS / newSpd; }
        f.wanderTimer = rng.between(
          f.type === FishType.Large || f.type === FishType.Boss ? 0.8 : 1.6,
          4.2,
        );
      }

      // Soft Y-boundary spring
      if (f.y < Y_SOFT_MIN) f.vy += 160 * dt;
      else if (f.y > Y_SOFT_MAX) f.vy -= 160 * dt;
    }

    if (f.hitFlash > 0) f.hitFlash = Math.max(0, f.hitFlash - dt * 6);
  }
}

export function removeDespawnedFish(fish: FishState[]): FishState[] {
  const margin = FISH_OFFSCREEN_MARGIN * 2;
  return fish.filter((f) => {
    if (!f.alive) return false;
    const hw = FISH_HITBOX_W[f.type];
    const hh = FISH_HITBOX_H[f.type];
    return (
      f.x > -margin - hw &&
      f.x < CANVAS_WIDTH + margin + hw &&
      f.y > -margin - hh &&
      f.y < CANVAS_HEIGHT + margin + hh
    );
  });
}

export function getFishValue(
  type: FishType,
  sessionTime: number,
  valueMultiplier: number,
  rng: Rng,
): number {
  const range = FISH_VALUE_MAX[type] - FISH_VALUE_MIN[type];
  const base = Math.floor(FISH_VALUE_MIN[type] + rng.next() * range);
  const timeBonus = 1 + sessionTime / 100;
  return Math.floor(base * timeBonus * valueMultiplier);
}

export function getSpawnInterval(sessionTime: number): number {
  const t = Math.min(sessionTime / FISH_SPAWN_TIME_SCALE, 1);
  return BASE_FISH_SPAWN_INTERVAL - t * (BASE_FISH_SPAWN_INTERVAL - MIN_FISH_SPAWN_INTERVAL);
}

/** Force-spawn a specific fish type (used for treasure fish). */
export function spawnFishOfType(id: number, rng: Rng, type: FishType): FishState {
  const speed = rng.between(FISH_SPEEDS_MIN[type], FISH_SPEEDS_MAX[type]);
  const fromLeft = rng.next() < 0.5;
  const ang = fromLeft
    ? rng.between(-Math.PI * 0.28, Math.PI * 0.28)
    : rng.between(Math.PI * 0.72, Math.PI * 1.28);
  return {
    id,
    x: fromLeft ? -FISH_OFFSCREEN_MARGIN : CANVAS_WIDTH + FISH_OFFSCREEN_MARGIN,
    y: rng.between(Y_MIN, Y_MAX),
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    wanderTimer: rng.between(1.4, 3.8),
    age: 0,
    hasAttacked: false,
    type,
    alive: true,
    hitFlash: 0,
  };
}

/** Rock boss: slow, large; HP handled in GameLogic. */
export function spawnBossFish(id: number, rng: Rng): FishState {
  const type = FishType.Boss;
  const s = spawnFishOfType(id, rng, type);
  return { ...s, hitPoints: BOSS_FISH_MAX_HP };
}

export function getFishHitbox(fish: FishState): { x: number; y: number; hw: number; hh: number } {
  return {
    x: fish.x,
    y: fish.y,
    hw: FISH_HITBOX_W[fish.type] / 2,
    hh: FISH_HITBOX_H[fish.type] / 2,
  };
}
