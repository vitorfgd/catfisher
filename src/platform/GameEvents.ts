// Platform-level adapters and command contracts.
// Core logic emits GameEvent; platform adapters consume it for audio/HUD/analytics.

export type { GameEvent } from '../core/Types';
export type { GameInputCommand } from '../shared/InputCommands';

export interface InputAdapter {
  drainCommands(): import('../shared/InputCommands').GameInputCommand[];
}

export interface AudioAdapter {
  handleEvent(event: import('../core/Types').GameEvent): void;
}
