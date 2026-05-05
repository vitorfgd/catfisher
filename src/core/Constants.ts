// @GUARD: All tunable game values live here. Change values here to rebalance.

export const CANVAS_WIDTH = 480;
/** Logical portrait 9:20 (width : height). */
export const CANVAS_HEIGHT = Math.round((CANVAS_WIDTH * 20) / 9);
export const GAME_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

/** Bottom bar: round timer + oxygen strip (logical px). */
export const HUD_TIME_STRIP_HEIGHT = 50;
export const HUD_TIME_STRIP_Y = CANVAS_HEIGHT - HUD_TIME_STRIP_HEIGHT;

// Player — turret fixed to the bottom of the playfield; (PLAYER_X, PLAYER_Y) = bottom center of the sprite
export const PLAYER_X = CANVAS_WIDTH / 2;
export const PLAYER_Y = CANVAS_HEIGHT;
export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 48;

/** Draw size for `playerTurret` art (source PNG is 500x500) */
export const TURRET_SPRITE_W = 240;
export const TURRET_SPRITE_H = 240;
/** Muzzle in sprite space: U = horizontal from left edge, V = vertical from top (0 = top). */
export const TURRET_MUZZLE_U = 0.64;
export const TURRET_MUZZLE_V = 0.18;

// Spear
export const SPEAR_SPEED = 920;
export const SPEAR_RETURN_SPEED = 1120;
export const BASE_SPEAR_MAX_DISTANCE = 500;
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
export const FISH_SPAWN_MAX_ALIVE = 20;
/** Continuous spawn interval multiplier grows with wave (1 = wave 0, +~9% per wave, capped) */
export const FISH_SPAWN_WAVE_INTERVAL_SCALE_PER_WAVE = 0.09;
export const FISH_SPAWN_WAVE_INTERVAL_SCALE_CAP = 1.85;
/** When the first first-dive showcase fish is caught, the other two use this (px/s) in `ftueFleeing` mode. */
export const FTUE_REMAINING_FLEESPEED = 780;

// Dive round timer: upgrade "oxygen" still adds max seconds per run (see UpgradeBalance)
export const BASE_OXYGEN = 38;
export const OXYGEN_PER_LEVEL = 7;
/** O₂ meter loss per real second: >1 makes the bar drain faster (same `roundTimeMax` in seconds). */
export const OXYGEN_DRAIN_RATE = 1.4;

/** Difficulty "waves" in HUD: wave = 1 + floor(sessionTime / WAVE_DURATION_SEC). */
export const WAVE_DURATION_SEC = 8;
/** New wave: spawn a cluster; ~1/3 off-screen toward player, rest at edges. */
export const WAVE_BURST_BASE_COUNT = 6;
/** Extra fish per wave index, capped (prevents late waves from maxing 8+ fish every 8s). */
export const WAVE_BURST_EXTRA_PER_WAVE = 1;
export const WAVE_BURST_MAX_COUNT = 10;
export const WAVE_BURST_EXTRA_CAP = 4; // on top of base, max +4 from wave index
/** Speargun level adds a small wave-density bump: lv2/3 +1, lv4 +2. */
export const FISH_DENSITY_SPEARGUN_LEVELS_PER_EXTRA = 2;
/** Fish being reeled in starts normal and grows as it approaches the first-person anchor. */
export const REELED_FISH_SCALE_START = 0.82;
export const REELED_FISH_SCALE_END = 1.42;
/** Fraction of a burst that uses off-screen spawns aimed inward (toward player), vs random edges */
export const WAVE_NEAR_SPAWN_FRACTION = 0;
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
/** White flash: ramp up, then fade (softer than full-screen modal beat). */
export const TREASURE_REVEAL_WHITE_PEAK_SEC = 0.05;
export const TREASURE_REVEAL_WHITE_FADE_SEC = 0.1;
/** HUD money count-up + flying coin arc length after treasure award. */
export const TREASURE_MONEY_LERP_SEC = 0.52;
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
/**
 * How far **above** `PLAYER_Y` we measure “blocking” (cat sprite vs feet anchor).
 * Separation uses the point `(PLAYER_X, PLAYER_Y - this)`.
 */
export const BOSS_AVOIDANCE_ANCHOR_OFFSET_Y = 56;
/**
 * Min distance from the avoidance point so the huge boss can’t sit over the play lane.
 * (Larger = rockfish is pushed more into the open water.)
 */
export const BOSS_MIN_CENTER_DISTANCE_FROM_PLAYER = 198;
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
export const FISH_SPAWN_WEIGHTS = [ 49,  24,  2,   2,  8,   8,   0,   0,   4];

// Shark (Large) attack
export const SHARK_ATTACK_RANGE  = 120;  // px radius from first-person bottom-center anchor
export const SHARK_AGGRO_DELAY   = 1.8;  // seconds alive before shark can attack
export const SHARK_ATTACK_DAMAGE = 7;    // time (seconds) lost per bite
export const SHARK_ATTACK_CHARGE_SPEED = 285; // px/s toward the first-person anchor
export const SHARK_ATTACK_GROW_SEC = 2.35;    // visual charge scale-up duration
export const SHARK_BITE_FLASH_DECAY = 4.8;    // red overlay fade speed after a bite
export const SHARK_MAX_ALIVE = 1;

// Pufferfish reward
export const PUFFER_TIME_BONUS = 6;  // seconds added to round timer on catch

// Fish Y spawn range — use most of the playfield now that there is no character safe zone.
export const FISH_Y_MIN_FRAC = 0.17;
export const FISH_Y_MAX_FRAC = 0.78;

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

// Boat screen — `BOAT_SHELL_*` = wide deck panel; `BOAT_DECK_CONTENT_INSET_H` = padding inside shell to content column.
// For helpers see `src/shared/BoatUiLayout.ts`.
export const UPGRADE_MARGIN = 20;
/** Deck panel: full width inside outer margin (wider than the content column). */
export const BOAT_SHELL_X = UPGRADE_MARGIN;
export const BOAT_SHELL_W = CANVAS_WIDTH - 2 * UPGRADE_MARGIN;
/**
 * Horizontal inset from shell inner edge → stats / upgrades / gear / DIVE (both sides).
 * Slightly tighter than the old 14px “sheet” pad so the content column gains width while the shell stays wide.
 */
export const BOAT_DECK_CONTENT_INSET_H = 12;
/** @deprecated use BOAT_DECK_CONTENT_INSET_H (kept equal for any stray references). */
export const BOAT_SHEET_PAD = BOAT_DECK_CONTENT_INSET_H;
export const UPGRADE_BUTTON_W = BOAT_SHELL_W - 2 * BOAT_DECK_CONTENT_INSET_H;
/** Content column inside the shell (must match hit-tests in UiLayout). */
export const BOAT_CONTENT_X = BOAT_SHELL_X + BOAT_DECK_CONTENT_INSET_H;
export const BOAT_CONTENT_W = UPGRADE_BUTTON_W;
/** Left/right padding from content column edge to primary text in stats rows. */
export const BOAT_CONTENT_TEXT_PAD_X = 12;

/** Boat menu title PNG is 1024×682; scale to shell width with a height cap. */
export const BOAT_TITLE_LOGO_ASPECT = 1024 / 682;
export const BOAT_TITLE_LOGO_TOP = 15;
export const BOAT_TITLE_LOGO_GAP_TO_STATS = 18;
export const BOAT_TITLE_LOGO_MAX_H_PX = 236;
/** Full-screen dim over `boatBg` on the boat menu. */
export const BOAT_MENU_SCRIM_ALPHA = 0.2;

export function getBoatTitleLogoDrawSize(): { drawW: number; drawH: number } {
  const maxW = BOAT_SHELL_W;
  const maxH = BOAT_TITLE_LOGO_MAX_H_PX;
  let drawW = maxW;
  let drawH = Math.round(drawW / BOAT_TITLE_LOGO_ASPECT);
  if (drawH > maxH) {
    drawH = maxH;
    drawW = Math.round(drawH * BOAT_TITLE_LOGO_ASPECT);
  }
  return { drawW, drawH };
}

/** Bank / last-dive card top Y — sits under the title logo. */
export function getBoatStatsCardTopY(): number {
  return BOAT_TITLE_LOGO_TOP + getBoatTitleLogoDrawSize().drawH + BOAT_TITLE_LOGO_GAP_TO_STATS;
}

export const UPGRADE_BUTTON_H = 88;
export const UPGRADE_BUTTON_GAP = 10;
/** Extra px to push the upgrade/gear block down (tweak one number instead of retuning formulas). */
export const BOAT_UPGRADES_VERTICAL_NUDGE_PX = 132;
/**
 * First upgrade row Y — scaled for 9:20 + `BOAT_UPGRADES_VERTICAL_NUDGE_PX`.
 * Legacy reference height 854 = old 9:16 logical canvas.
 */
export const UPGRADE_BUTTONS_TOP =
  327 + Math.round((CANVAS_HEIGHT - 854) * 0.28) + BOAT_UPGRADES_VERTICAL_NUDGE_PX;
/** Bottom Y of the last upgrade row (exclusive of margin below the row). */
export const UPGRADE_LAST_ROW_BOTTOM =
  UPGRADE_BUTTONS_TOP + 3 * UPGRADE_BUTTON_H + 2 * UPGRADE_BUTTON_GAP;
/**
 * Section header block height (UPGRADES + GEAR): label + rule — must match `drawSectionHeader` in boatScreen.
 */
export const SECTION_HEADER_BLOCK_H = 46;
/** @deprecated alias — use SECTION_HEADER_BLOCK_H */
export const GEAR_SECTION_HEADER_H = SECTION_HEADER_BLOCK_H;
/** Gap from UPGRADES header top to first upgrade row. */
export const UPGRADE_SECTION_HEADER_GAP = 10;
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
export const UPGRADE_PANEL_BUY_Y = CANVAS_HEIGHT - 120;
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
export const DIVE_BUTTON_LABEL_Y_OFFSET = 3;
export const NET_COST = 30;
export const BAIT_COST = 45;
export const NET_MAX_STOCK = 3;
export const BAIT_MAX_STOCK = 3;
export const BAIT_DURATION = 6.0;            // seconds bait remains active
/** Dropped at cave center; in-world `iconBait` draw size (menu uses same asset at ~40px in HUD) */
export const BAIT_LURE_ICON_PX = 56;
/** How many small fish appear when a lure is used (capped by `FISH_SPAWN_MAX_ALIVE`) */
export const BAIT_SCHOOL_FISH_COUNT = 2;
/**
 * Lured fish: inside this dist they orbit; outside they’re pulled in (larger = wider swarm ring)
 */
export const BAIT_ORBIT_RADIUS = 80;
export const BAIT_TANGENT_ACCEL = 200;
export const BAIT_ATTRACT = 300;
/** On use: fish this close to the lure get a velocity kick toward it (in addition to ongoing pull) */
export const BAIT_NUDGE_NEAR_PX = 400;
export const BAIT_NUDGE_IMPULSE = 240;
/** Fish slightly farther: stronger pull in `updateFish` (multiplier on attract term) */
export const BAIT_COMING_ATTRACT_MULTIPLIER = 1.6;
/** Between orbit and this distance, attraction runs stronger so fish on their way in gather faster */
export const BAIT_COMING_MID_PX2 = 480;
