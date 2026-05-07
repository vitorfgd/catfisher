// Browser-only tutorial persistence. Core owns hint timing; platform remembers what was shown.

import type { TutorialHintId, TutorialSeenState } from '../core/Types';

const TUTORIAL_SEEN_KEY = 'grumpiest_catch_tutorial_seen_v1';

export function readTutorialSeenState(): Partial<TutorialSeenState> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<TutorialSeenState>;
  } catch {
    return {};
  }
}

export function markTutorialHintSeen(id: TutorialHintId): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const seen = readTutorialSeenState();
    seen[id] = true;
    localStorage.setItem(TUTORIAL_SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* private mode, etc. */
  }
}
