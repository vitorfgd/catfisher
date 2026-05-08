/** Natural pixel size of `assets/ftue-hand.png` (do not stretch to a square). */
export const FTUE_HAND_SRC_W = 259;
export const FTUE_HAND_SRC_H = 148;

/** In-world FTUE cues (fish / shark / treasure targets). Long edge in logical px. */
export const FTUE_HAND_MAX_SPAN_WORLD_PX = 84;
/** HUD consumable prompts — slightly larger for thumb-zone readability. */
export const FTUE_HAND_MAX_SPAN_HUD_PX = 100;
/** Boat menu upgrade cue. */
export const FTUE_HAND_MAX_SPAN_BOAT_PX = 84;
/** Breach leaderboard tap cue = world span × this (fits gap above card). */
export const FTUE_HAND_BREACH_SPAN_MULT = 0.92;

/**
 * Scale the hand art so its longest edge equals `maxSpanPx`; preserves aspect ratio.
 */
export function getFtueHandDrawSize(maxSpanPx: number): { w: number; h: number } {
  const scale = maxSpanPx / Math.max(FTUE_HAND_SRC_W, FTUE_HAND_SRC_H);
  return {
    w: FTUE_HAND_SRC_W * scale,
    h: FTUE_HAND_SRC_H * scale,
  };
}
