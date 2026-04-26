// @GUARD: All tunable game values live here. Change values here to rebalance.

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 854;
export const GAME_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

// Player — positioned to stand on the stone pedestal in the underwater background
export const PLAYER_X = CANVAS_WIDTH / 2;
export const PLAYER_Y = CANVAS_HEIGHT * 0.714; // feet land on top of the pedestal (~73% height)
export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 48;

// Spear
export const SPEAR_SPEED = 920;
export const SPEAR_RETURN_SPEED = 1120;
export const BASE_SPEAR_MAX_DISTANCE = 300;
export const SPEAR_RANGE_PER_LEVEL = 88;
export const BASE_SHOOT_COOLDOWN = 0.34;
export const SHOOT_COOLDOWN_REDUCTION = 0.05;

// Fish
export const FISH_OFFSCREEN_MARGIN = 80;
export const BASE_FISH_SPAWN_INTERVAL = 1.55;   // sparser as waves scale (bursts + cap do heavy lifting)
export const MIN_FISH_SPAWN_INTERVAL = 1.02;   // cap so late waves do not crowd the playfield
/** Seconds in-dive to reach max spawn rate (replaces old depth-based ramp). */
export const FISH_SPAWN_TIME_SCALE = 80;
/** Soft cap: skip passive spawns (not treasure/boss) when this many fish are alive */
export const FISH_SPAWN_MAX_ALIVE = 13;
/** Continuous spawn interval multiplier grows with wave (1 = wave 0, +~9% per wave, capped) */
export const FISH_SPAWN_WAVE_INTERVAL_SCALE_PER_WAVE = 0.09;
export const FISH_SPAWN_WAVE_INTERVAL_SCALE_CAP = 1.85;

// Dive round timer: upgrade "oxygen" still adds max seconds per run (see UpgradeBalance)
export const BASE_OXYGEN = 38;
export const OXYGEN_PER_LEVEL = 7;

/** Difficulty "waves" in HUD: wave = 1 + floor(sessionTime / WAVE_DURATION_SEC). */
export const WAVE_DURATION_SEC = 8;
/** New wave: spawn a cluster; ~1/3 off-screen toward player, rest at edges. */
export const WAVE_BURST_BASE_COUNT = 3;
/** Extra fish per wave index, capped (prevents late waves from maxing 8+ fish every 8s). */
export const WAVE_BURST_EXTRA_PER_WAVE = 1;
export const WAVE_BURST_MAX_COUNT = 5;
export const WAVE_BURST_EXTRA_CAP = 2; // on top of base, max +2 from wave index
/** Fraction of a burst that uses off-screen spawns aimed inward (toward player), vs random edges */
export const WAVE_NEAR_SPAWN_FRACTION = 0.34;
export const RARE_FISH_MIN_SESSION_TIME = 6;

// Dive transition
export const DIVE_DURATION = 0.45; // seconds

// Upgrade costs per level (index = target level - 2, so [0] = cost to reach lvl2)
// Design: ~one meaningful purchase per full dive early on; mid tier needs several dives banked;
// final tier is a long grind so there is reason to keep playing. (Full max ≈ many × a 3–4k run.)
export const UPGRADE_COSTS: Record<string, number[]> = {
  speargun: [920, 2800, 9800],
  haul:     [860, 2500, 8600],
  oxygen:   [800, 2300, 7800],
};

// Treasure fish — spawns on a timer in every dive (independent of haul level)
export const TREASURE_SPAWN_INTERVAL = 28.0;  // seconds between treasure spawns
/** Cinematic when spear-cashed treasure opens (Ridiculous Hook–style). */
export const TREASURE_REVEAL_DURATION_SEC = 1.35;
export const TREASURE_REVEAL_AWARD_AT_SEC = 0.58;
/** White flash: ramp up, then fade before chest reads (Ridiculous Fishing–style beat). */
export const TREASURE_REVEAL_WHITE_PEAK_SEC = 0.1;
export const TREASURE_REVEAL_WHITE_FADE_SEC = 0.15;
export const UPGRADE_MAX_LEVEL = 4;

// Rock boss (spawned on timer, not in random table) — ~first boss 22–32s, then on interval
export const BOSS_SPAWN_INTERVAL = 50.0;
/** Min seconds in-dive before a boss is allowed (not in FTUE: timer still runs). */
export const BOSS_SPAWN_MIN_TIME = 10;
/** After reset: countdown until first boss check; keep <= BOSS_SPAWN_INTERVAL. */
export const BOSS_SPAWN_FIRST_DELAY = 20;
export const BOSS_FISH_MAX_HP = 24;
/** Spear levels below this deal no damage to the boss (still shows hit feedback) */
export const BOSS_MIN_SPEAR_LEVEL_TO_DAMAGE = 2;
/** Softening net vs boss so it is still secondary to the speargun */
export const BOSS_NET_DAMAGE = 6;

/** Spear damage per hit to the rock boss (level 1 cannot deal damage). */
export function getBossSpearDamage(speargunLevel: number): number {
  if (speargunLevel < BOSS_MIN_SPEAR_LEVEL_TO_DAMAGE) return 0;
  return speargunLevel;
}

// Fish stats [Small, Medium, Large, Rare (swordfish), Jelly, Puffer, Treasure, Boss, Clown]
export const FISH_SPEEDS_MIN    = [150,  90, 52,  72, 30,  52,  22,  24,  80];
export const FISH_SPEEDS_MAX    = [220, 132, 82, 110, 55,  86,  38,  40, 118];
export const FISH_VALUE_MIN     = [  3,   9, 24,  90, 12,   2, 280,  900,  18];
export const FISH_VALUE_MAX     = [  6,  16, 40, 150, 22,   8, 520, 1500,  32];
export const FISH_HITBOX_W      = [ 28,  42, 64,  34, 38,  28,  44, 180,  40];
export const FISH_HITBOX_H      = [ 18,  24, 36,  30, 38,  28,  36, 150,  24];
export const FISH_SPAWN_WEIGHTS = [ 46,  22,  6,   2,  8,   8,   0,   0,   3];

// Shark (Large) attack
export const SHARK_ATTACK_RANGE  = 72;   // px radius from player center
export const SHARK_AGGRO_DELAY   = 1.8;  // seconds alive before shark can attack
export const SHARK_ATTACK_DAMAGE = 7;    // time (seconds) lost per bite

// Pufferfish reward
export const PUFFER_TIME_BONUS = 6;  // seconds added to round timer on catch

// Fish Y spawn range — must stay within the cave opening in the background image
// Cave light shaft runs from ~10% to ~65% canvas height
export const FISH_Y_MIN_FRAC = 0.11;
export const FISH_Y_MAX_FRAC = 0.62;

// Juice
export const SHAKE_DECAY = 28;
export const SHAKE_ON_HOOK = 2.1;
export const SHAKE_ON_CATCH = 1.1;
export const SHAKE_COMBO_SCALE = 0.5;   // multiplier applied to combo shake accumulation
export const PARTICLE_COUNT_ON_HIT = 12;
export const PARTICLE_SPEED_MIN = 70;
export const PARTICLE_SPEED_MAX = 220;
export const PARTICLE_LIFE = 0.55;
export const PARTICLE_STREAK_FRACTION = 0.35;
export const RING_COUNT_HOOK = 18;
export const RING_COUNT_CATCH = 26;
export const FLOATING_TEXT_SPEED = -72;
export const FLOATING_TEXT_LIFE = 0.9;
export const CATCH_FLASH_DECAY = 2.6;
export const CATCH_FLASH_CAP = 0.2;

// Boat screen — outer margin + BOAT_SHEET_PAD insets the scroll column inside the deck
// (prevents rows from sitting flush to the deck edge). Hit-tests use the same values.
export const UPGRADE_MARGIN = 20;
export const BOAT_SHEET_PAD = 14;
export const UPGRADE_BUTTON_W = CANVAS_WIDTH - 2 * UPGRADE_MARGIN - 2 * BOAT_SHEET_PAD;
export const UPGRADE_BUTTON_H = 88;
export const UPGRADE_BUTTON_GAP = 10;
export const UPGRADE_BUTTONS_TOP = 350;
/** Bottom Y of the last upgrade row (exclusive of margin below the row). */
export const UPGRADE_LAST_ROW_BOTTOM =
  UPGRADE_BUTTONS_TOP + 3 * UPGRADE_BUTTON_H + 2 * UPGRADE_BUTTON_GAP;
/**
 * GEAR section header block height: drawSectionHeader (label + rule line) — must match boatScreen.
 */
export const GEAR_SECTION_HEADER_H = 23;
/** Space from last upgrade row to GEAR title (aligns with UPGRADES spacing feel). */
export const MARGIN_UPGRADES_TO_GEAR = 14;
/** Space from GEAR header rule to top of consumable cards. */
export const MARGIN_GEAR_TO_CONSUMABLE = 5;
export const GEAR_HEADER_LABEL_Y = UPGRADE_LAST_ROW_BOTTOM + MARGIN_UPGRADES_TO_GEAR;
export const CONSUMABLE_H = 88;
export const CONSUMABLE_GAP = 12;
export const CONSUMABLE_W = Math.floor((UPGRADE_BUTTON_W - CONSUMABLE_GAP) / 2);
export const CONSUMABLE_Y =
  GEAR_HEADER_LABEL_Y + GEAR_SECTION_HEADER_H + MARGIN_GEAR_TO_CONSUMABLE;
// Upgrade detail panel (full-screen overlay when a button is tapped)
export const UPGRADE_PANEL_BUY_Y = CANVAS_HEIGHT - 120;    // buy button anchored to bottom (= 734)
export const UPGRADE_PANEL_BUY_H = 60;
export const DIVE_BUTTON_GAP = 20;
export const BOAT_DECK_TOP_PAD = 20; // PANEL top → UPGRADES label; keep equal to DIVE_BUTTON_GAP
/** Padding below DIVE inside the deck shell (visual breathing room). */
export const BOAT_SHELL_BELOW_DIVE = 18;
/**
 * Max Y for the bottom of the main-menu deck shell. Must be the canvas bottom: if this
 * is less than DIVE + BOAT_SHELL_BELOW_DIVE, the shell is clipped and the under-DIVE margin collapses.
 */
export const BOAT_SHELL_MAX_BOTTOM = CANVAS_HEIGHT;
/** Min gap from other full-screen UIs to canvas edge; do not use to cap the boat shell (see BOAT_SHELL_MAX_BOTTOM). */
export const BOAT_SCREEN_EDGE = 10;
export const DIVE_BUTTON_Y = CONSUMABLE_Y + CONSUMABLE_H + DIVE_BUTTON_GAP;
export const DIVE_BUTTON_HEIGHT = 52;         // large tap target
export const NET_COST = 30;
export const BAIT_COST = 45;
export const NET_MAX_STOCK = 3;
export const BAIT_MAX_STOCK = 3;
export const BAIT_DURATION = 6.0;            // seconds bait remains active
