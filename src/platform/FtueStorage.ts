// @GUARD: Browser only — not imported from core/

const FTUE_DIVE_KEY = 'fishercat_ftue_dive_done';

export function isFtueDivePendingInStorage(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return !localStorage.getItem(FTUE_DIVE_KEY);
  } catch {
    return false;
  }
}

export function markFtueDiveCompleteInStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FTUE_DIVE_KEY, '1');
    }
  } catch {
    /* private mode, etc. */
  }
}
