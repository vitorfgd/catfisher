import type { ParticleState, FloatingTextState } from './Types';
import type { Rng } from './Rng';
import {
  PARTICLE_COUNT_ON_HIT,
  PARTICLE_SPEED_MIN,
  PARTICLE_SPEED_MAX,
  PARTICLE_LIFE,
  PARTICLE_STREAK_FRACTION,
  RING_COUNT_HOOK,
  RING_COUNT_CATCH,
  FLOATING_TEXT_SPEED,
  FLOATING_TEXT_LIFE,
} from './Constants';
import { FishType } from './Types';

const PARTICLE_COLORS: Record<FishType, string[]> = {
  [FishType.Small]: ['#4dd9e8', '#a8f0f8', '#ffffff'],
  [FishType.Medium]: ['#f0c040', '#f8e090', '#ffffff'],
  [FishType.Large]: ['#f07830', '#f8b080', '#ffffff'],
  [FishType.Rare]: ['#e040fb', '#f8a0ff', '#ffffff', '#ffff80'],
  [FishType.Jelly]: ['#b0c8ff', '#e8eeff', '#ffffff'],
  [FishType.Puffer]: ['#FFD060', '#FF9020', '#ffffff'],
  [FishType.Treasure]: ['#FFD040', '#FFB800', '#ffffff', '#FFF0A0'],
  [FishType.Boss]: ['#c05040', '#8a3a2c', '#e8e0dc', '#ff8060', '#3a2a28'],
  [FishType.Clown]: ['#f07828', '#e0e8f0', '#8a4a2a', '#f8f0e8', '#ffffff'],
};

function pushSparkStreaks(
  particles: ParticleState[],
  x: number,
  y: number,
  colors: string[],
  rng: Rng,
  count: number,
  speedMin: number,
  speedMax: number,
  life: number,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = rng.between(0, Math.PI * 2);
    const speed = rng.between(speedMin, speedMax);
    const color = colors[Math.floor(rng.next() * colors.length)];
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      radius: rng.between(1.2, 2.6),
      streak: true,
      drag: 0.985,
      gravity: 90,
    });
  }
}

function pushOutwardRing(
  particles: ParticleState[],
  x: number,
  y: number,
  colors: string[],
  rng: Rng,
  count: number,
  speedMin: number,
  speedMax: number,
  life: number,
): void {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + rng.between(-0.08, 0.08);
    const speed = rng.between(speedMin, speedMax);
    const color = colors[Math.floor(rng.next() * colors.length)];
    particles.push({
      x: x + Math.cos(a) * rng.between(2, 6),
      y: y + Math.sin(a) * rng.between(2, 6),
      vx: Math.cos(a) * speed * rng.between(0.9, 1.15),
      vy: Math.sin(a) * speed * rng.between(0.9, 1.15),
      life,
      maxLife: life,
      color,
      radius: rng.between(1.5, 3.2),
      drag: 0.992,
      gravity: 55,
    });
  }
}

export function emitHitParticles(
  particles: ParticleState[],
  x: number,
  y: number,
  fishType: FishType,
  rng: Rng,
  intensity = 1,
): void {
  const colors = PARTICLE_COLORS[fishType];
  const count = Math.max(
    3,
    Math.floor(
      (fishType === FishType.Rare || fishType === FishType.Boss
        ? PARTICLE_COUNT_ON_HIT * 2
        : PARTICLE_COUNT_ON_HIT) * intensity,
    ),
  );
  const streakN = Math.floor(count * PARTICLE_STREAK_FRACTION);
  for (let i = 0; i < count; i += 1) {
    const angle = rng.between(0, Math.PI * 2);
    const speed = rng.between(PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX) * (0.85 + 0.2 * intensity);
    const useStreak = i < streakN;
    const color = colors[Math.floor(rng.next() * colors.length)];
    if (useStreak) {
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * 1.1,
        vy: Math.sin(angle) * speed * 1.1,
        life: PARTICLE_LIFE * (0.75 + 0.15 * intensity),
        maxLife: PARTICLE_LIFE * (0.75 + 0.15 * intensity),
        color,
        radius: rng.between(1, 2.3),
        streak: true,
        drag: 0.988,
        gravity: 100,
      });
    } else {
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * 0.9,
        vy: Math.sin(angle) * speed * 0.9,
        life: PARTICLE_LIFE * intensity,
        maxLife: PARTICLE_LIFE * intensity,
        color,
        radius: rng.between(2.5, 6.5) * (0.85 + 0.1 * intensity),
        drag: 0.99,
        gravity: 120,
      });
    }
  }
}

/** Big burst when the spear actually sticks (hook). */
export function emitHookImpactFX(
  particles: ParticleState[],
  x: number,
  y: number,
  fishType: FishType,
  rng: Rng,
): void {
  const colors = PARTICLE_COLORS[fishType];
  emitHitParticles(particles, x, y, fishType, rng, 1.35);
  pushOutwardRing(
    particles, x, y, colors, rng, RING_COUNT_HOOK,
    100, 280, 0.42,
  );
  pushSparkStreaks(
    particles, x, y, colors, rng,
    10,
    180, 420, 0.4,
  );
}

/** When money lands — confetti, ring, and spark shower scaled by value. */
export function emitCatchPayoffFX(
  particles: ParticleState[],
  x: number,
  y: number,
  fishType: FishType,
  value: number,
  rng: Rng,
): void {
  const colors = PARTICLE_COLORS[fishType];
  const w = 1 + Math.min(1.2, value / 180);
  emitHitParticles(particles, x, y, fishType, rng, 1.2 * w);
  const ringN = Math.min(36, Math.floor(RING_COUNT_CATCH * w));
  pushOutwardRing(
    particles, x, y, colors, rng, ringN, 80, 320 * w, 0.48 + 0.06 * w,
  );
  pushSparkStreaks(
    particles, x, y, colors, rng,
    Math.floor(14 * w), 200, 480 * w, 0.5,
  );
  if (value >= 80) {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const color = i % 2 ? '#fffc98' : '#6cf0d8';
      particles.push({
        x: x + Math.cos(a) * 4,
        y: y + Math.sin(a) * 4,
        vx: Math.cos(a) * rng.between(60, 140),
        vy: Math.sin(a) * rng.between(60, 140) - 40,
        life: 0.6,
        maxLife: 0.6,
        color,
        radius: rng.between(2, 3.5),
        drag: 0.987,
        gravity: 40,
      });
    }
  }
}

export function moneyTextTier(value: number): 'normal' | 'good' | 'jackpot' {
  if (value >= 200) return 'jackpot';
  if (value >= 45) return 'good';
  return 'normal';
}

export function emitFloatingText(
  texts: FloatingTextState[],
  x: number,
  y: number,
  value: number,
  options?: { pop?: boolean; tier?: 'normal' | 'good' | 'jackpot' },
): void {
  const tier = options?.tier ?? moneyTextTier(value);
  const pop = options?.pop ?? (tier !== 'normal');
  texts.push({
    x,
    y,
    vy: FLOATING_TEXT_SPEED * (pop ? 0.88 : 1),
    text: `+$${value}`,
    life: FLOATING_TEXT_LIFE * (pop ? 1.1 : 1),
    maxLife: FLOATING_TEXT_LIFE * (pop ? 1.1 : 1),
    textScale: pop ? 1.38 : 1.08,
    tier,
  });
}

export function updateParticles(particles: ParticleState[], dt: number): ParticleState[] {
  for (const p of particles) {
    const d = p.drag ?? 0.99;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(d, dt * 60);
    p.vy *= Math.pow(d, dt * 60);
    p.vy += (p.gravity ?? 120) * dt;
    p.life -= dt;
  }
  return particles.filter((p) => p.life > 0);
}

export function updateFloatingTexts(texts: FloatingTextState[], dt: number): FloatingTextState[] {
  for (const t of texts) {
    t.y += t.vy * dt;
    t.life -= dt;
    if (t.textScale != null && t.textScale > 1) {
      t.textScale = Math.max(1, t.textScale - dt * 2.2);
    }
  }
  return texts.filter((t) => t.life > 0);
}
