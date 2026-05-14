/**
 * Breach end-card stagger timing (must match `breachEndScreen.ts`).
 */

export const BREACH_FISH_COUNT_TICK = 0.052;
const FISH_COUNT_HOLD_FINAL = 0.14;

const REVEAL_PANEL = { delay: 0.4, dur: 0.34 } as const;
const TIME_ROW_POP_DUR = 0.46;
const MONEY_ROW_POP_DUR = 0.48;
const PHASE_GAP = 0.055;
const TIME_POST_COUNT_HOLD = 0.1;
const MONEY_POST_COUNT_HOLD = 0.12;

export const BREACH_REVEAL_BTN_ANIM_DURATION_SEC = 0.42;

export type BreachRevealSchedule = {
  fishCountStart: number;
  fishPhaseEnd: number;
  timeT0: number;
  timeCountStart: number;
  timeCountDur: number;
  timePhaseEnd: number;
  moneyT0: number;
  moneyCountStart: number;
  moneyCountDur: number;
  moneyPhaseEnd: number;
  btnT0: number;
};

function timeCountDuration(targetSec: number): number {
  const t = Math.max(0, Math.floor(targetSec));
  return Math.min(1.18, Math.max(0.5, 0.38 + Math.sqrt(t + 1) * 0.055));
}

function moneyCountDuration(targetMoney: number): number {
  const m = Math.max(0, Math.floor(targetMoney));
  return Math.min(1.9, Math.max(0.85, 0.65 + Math.sqrt(m + 1) * 0.05));
}

export function getBreachRevealSchedule(
  catchCount: number,
  actionSessionSec: number,
  earnings: number,
): BreachRevealSchedule {
  const N = Math.max(0, Math.floor(catchCount));
  const fishCountStart = REVEAL_PANEL.delay + REVEAL_PANEL.dur * 0.32;
  const fishPhaseEnd = fishCountStart + N * BREACH_FISH_COUNT_TICK + FISH_COUNT_HOLD_FINAL;

  const timeT0 = fishPhaseEnd + PHASE_GAP;
  const timeCountStart = timeT0 + TIME_ROW_POP_DUR * 0.32;
  const timeCountDur = timeCountDuration(actionSessionSec);
  const timePhaseEnd = timeCountStart + timeCountDur + TIME_POST_COUNT_HOLD;

  const moneyT0 = timePhaseEnd + PHASE_GAP;
  const moneyCountStart = moneyT0 + MONEY_ROW_POP_DUR * 0.32;
  const moneyCountDur = moneyCountDuration(earnings);
  const moneyPhaseEnd = moneyCountStart + moneyCountDur + MONEY_POST_COUNT_HOLD;

  const btnT0 = moneyPhaseEnd + PHASE_GAP;
  return {
    fishCountStart,
    fishPhaseEnd,
    timeT0,
    timeCountStart,
    timeCountDur,
    timePhaseEnd,
    moneyT0,
    moneyCountStart,
    moneyCountDur,
    moneyPhaseEnd,
    btnT0,
  };
}

/**
 * `breachSummaryRevealElapsed` thresholds for breach SFX: fish caught row, time underwater row,
 * money earned row only (not splash/title, stats panel shell, or CTA — see `breachEndScreen`).
 */
export function getBreachRevealSfxStepThresholdsSec(
  catchCount: number,
  actionSessionSec: number,
  earnings: number,
): readonly number[] {
  const sch = getBreachRevealSchedule(catchCount, actionSessionSec, earnings);
  const raw = [sch.fishCountStart, sch.timeT0, sch.moneyT0];
  raw.sort((a, b) => a - b);
  const out: number[] = [];
  let last = -Infinity;
  for (const x of raw) {
    if (x > last + 1e-4) {
      out.push(x);
      last = x;
    }
  }
  return out;
}
