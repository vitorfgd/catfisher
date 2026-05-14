// Platform-level adapters and command contracts.
// Core logic emits GameEvent; platform adapters consume it for audio/HUD/analytics.

export type { GameEvent } from '../core/Types';
export type { GameInputCommand } from '../shared/InputCommands';

export interface InputAdapter {
  drainCommands(): import('../shared/InputCommands').GameInputCommand[];
}

export interface AudioAdapter {
  handleEvent(event: import('../core/Types').GameEvent): void;
  /** Browser: loop background music only while gameplay is active. */
  syncBackgroundMusic(active: boolean): void;
  /** Browser: loop menu ambience while `true` (e.g. `GamePhase.Boat`). */
  syncBoatMenuAmbient(active: boolean): void;
  /** Browser: loop underwater bed while `true` (`Diving` / `Action` / `Breaching`). */
  syncUnderwaterAmbient(active: boolean): void;
  /** Browser: mute/unmute background music (sample loops stay unchanged). */
  syncMusicMuted(muted: boolean): void;
  /**
   * Breach end screen: quiet bed while the money line counts up (`level01` 0–1 from core).
   * MHS port can no-op.
   */
  syncBreachMoneyChime(ctx: { active: boolean; level01: number }): void;
}
