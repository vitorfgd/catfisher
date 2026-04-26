/**
 * In Action, the world is drawn with a uniform zoom around a focus (usually near the player).
 * Pointer events arrive in unscaled canvas space; this maps them back to world coords for aim.
 */
export const ACTION_VIEW_ZOOM = 1.14; // between 1x and FTUE; tweak for “normal” closeness
export const FTUE_VIEW_ZOOM = 1.28;
/** Lerp 1x → full zoom on dive start to avoid a visible snap. */
export const ACTION_ZOOM_EASE_IN_SEC = 0.75;

export function actionViewFocus(playerX: number, playerY: number): { x: number; y: number } {
  return { x: playerX, y: playerY - 102 };
}

/**
 * Invert RenderFrame’s `pushTranslate(shake)` + `pushScale(z,z, focus)` (RenderFrame order).
 */
export function canvasToActionWorld(
  canvasX: number,
  canvasY: number,
  shakeX: number,
  shakeY: number,
  playerX: number,
  playerY: number,
  zoom: number,
): { x: number; y: number } {
  const zf = actionViewFocus(playerX, playerY);
  if (Math.abs(zoom - 1) < 1e-6) {
    return { x: canvasX - shakeX, y: canvasY - shakeY };
  }
  const sx = canvasX - shakeX;
  const sy = canvasY - shakeY;
  return {
    x: zf.x + (sx - zf.x) / zoom,
    y: zf.y + (sy - zf.y) / zoom,
  };
}

/**
 * Eased world zoom: starts at 1, reaches target after ACTION_ZOOM_EASE_IN_SEC.
 * Must match pointer unprojection in `canvasToActionWorld` (use same session time).
 */
export function getActionViewZoomForSession(sessionTimeSec: number, ftueActive: boolean): number {
  const target = ftueActive ? FTUE_VIEW_ZOOM : ACTION_VIEW_ZOOM;
  const u = Math.min(1, sessionTimeSec / ACTION_ZOOM_EASE_IN_SEC);
  const smooth = u * u * (3 - 2 * u);
  return 1 + (target - 1) * smooth;
}
