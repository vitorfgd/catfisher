// @GUARD: Browser only — not imported from core/

const LEGACY_FTUE_DIVE_KEY = 'grumpiest_catch_ftue_dive_done';
const FTUE_FLOW_KEY = 'grumpiest_catch_ftue_flow_v2_done';
const FTUE_OXYGEN_LESSON_KEY = 'grumpiest_catch_ftue_oxygen_lesson_v1_done';

export function isFtueDivePendingInStorage(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return !localStorage.getItem(FTUE_FLOW_KEY) && !localStorage.getItem(LEGACY_FTUE_DIVE_KEY);
  } catch {
    return false;
  }
}

export function markFtueDiveCompleteInStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FTUE_FLOW_KEY, '1');
    }
  } catch {
    /* private mode, etc. */
  }
}

export function isFtueOxygenLessonSeenInStorage(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(FTUE_OXYGEN_LESSON_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFtueOxygenLessonSeenInStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FTUE_OXYGEN_LESSON_KEY, '1');
    }
  } catch {
    /* private mode, etc. */
  }
}
