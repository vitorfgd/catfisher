// Browser-only game loop. Do not import from core/ or render/.
// Owns requestAnimationFrame, dt clamping, and event dispatch.

import type { FullGameState } from '../core/Types';
import { GamePhase } from '../core/Types';
import { drainEvents, getRenderState, setLeaderboardEntries, update } from '../core/GameLogic';
import { markFtueDiveCompleteInStorage, markFtueOxygenLessonSeenInStorage } from './FtueStorage';
import { markTutorialHintSeen } from './TutorialStorage';
import type { GameRenderer } from '../render/GameRenderer';
import { renderFrame } from '../render/RenderFrame';
import type { BrowserInputAdapter } from './BrowserInputAdapter';
import type { AudioAdapter, InputAdapter } from './GameEvents';
import type { LeaderboardAdapter } from './LeaderboardAdapter';

export class BrowserGameLoop {
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly state: FullGameState,
    private readonly renderer: GameRenderer,
    private readonly input: InputAdapter & Pick<BrowserInputAdapter, 'setPhase' | 'setBoatUiState'>,
    private readonly audio: AudioAdapter,
    private readonly leaderboard: LeaderboardAdapter,
  ) {}

  start(): void {
    this.running = true;
    requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
  }

  private readonly tick = (timeMs: number): void => {
    if (!this.running) return;

    const dt = this.lastTime === 0 ? 0 : Math.min((timeMs - this.lastTime) / 1000, 0.1);
    this.lastTime = timeMs;

    this.input.setPhase(this.state.phase === GamePhase.Boat);
    this.input.setBoatUiState(this.state.upgradePanelOpen);

    const commands = this.input.drainCommands();
    update(this.state, dt, commands);

    renderFrame(this.renderer, getRenderState(this.state));

    this.audio.syncBoatMenuAmbient(this.state.phase === GamePhase.Boat);
    this.audio.syncUnderwaterAmbient(this.state.phase !== GamePhase.Boat);

    for (const event of drainEvents(this.state)) {
      if (event.type === 'ftueDiveExited') {
        markFtueDiveCompleteInStorage();
        continue;
      }
      if (event.type === 'ftueOxygenLessonShown') {
        markFtueOxygenLessonSeenInStorage();
        continue;
      }
      if (event.type === 'tutorialHintShown') {
        markTutorialHintSeen(event.id);
        continue;
      }
      if (event.type === 'runEnded') {
        const snapshot = this.leaderboard.submitFishCaught(event.catchCount, event.earnings);
        setLeaderboardEntries(
          this.state,
          snapshot.entries,
          snapshot.bestFishCaught,
          snapshot.lastSubmittedFishCaught,
          snapshot.bestRunMoney,
          snapshot.bestRunFishCaught,
          snapshot.allTimeFishCaught,
        );
      }
      this.audio.handleEvent(event);
    }

    requestAnimationFrame(this.tick);
  };
}
