// Browser-only game loop. Do not import from core/ or render/.
// Owns requestAnimationFrame, dt clamping, and event dispatch.

import type { FullGameState } from '../core/Types';
import { GamePhase } from '../core/Types';
import { drainEvents, getRenderState, setLeaderboardEntries, update } from '../core/GameLogic';
import { getBreachMoneyChimeLevel01, isBreachingAwaitingConfirm } from '../core/diveTransitionController';
import { markFtueDiveCompleteInStorage, markFtueOxygenLessonSeenInStorage } from './FtueStorage';
import { markTutorialHintSeen } from './TutorialStorage';
import type { GameRenderer } from '../render/GameRenderer';
import { renderFrame } from '../render/RenderFrame';
import type { BrowserInputAdapter } from './BrowserInputAdapter';
import type { AudioAdapter, InputAdapter } from './GameEvents';
import type { LeaderboardAdapter } from './LeaderboardAdapter';
import { writeMusicMutedStorage } from './MusicMutedStorage';

export class BrowserGameLoop {
  private lastTime = 0;
  private running = false;
  private persistedMusicMuted: boolean;

  constructor(
    private readonly state: FullGameState,
    private readonly renderer: GameRenderer,
    private readonly input: InputAdapter & Pick<BrowserInputAdapter, 'setPhase' | 'setBoatUiState' | 'setBreachingAwaitingConfirm'>,
    private readonly audio: AudioAdapter,
    private readonly leaderboard: LeaderboardAdapter,
  ) {
    this.persistedMusicMuted = state.musicMuted;
  }

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
    this.input.setBoatUiState(this.state.upgradePanelOpen, this.state.boatLeaderboardOpen);
    this.input.setBreachingAwaitingConfirm(isBreachingAwaitingConfirm(this.state));

    const commands = this.input.drainCommands();
    update(this.state, dt, commands);

    renderFrame(this.renderer, getRenderState(this.state));

    if (this.state.musicMuted !== this.persistedMusicMuted) {
      writeMusicMutedStorage(this.state.musicMuted);
      this.persistedMusicMuted = this.state.musicMuted;
    }
    this.audio.syncMusicMuted(this.state.musicMuted);
    this.audio.syncBackgroundMusic(this.state.phase === GamePhase.Action);
    this.audio.syncBoatMenuAmbient(this.state.phase === GamePhase.Boat);
    this.audio.syncUnderwaterAmbient(
      this.state.phase !== GamePhase.Boat
        && !(this.state.phase === GamePhase.Breaching && this.state.breachLeaderboardDismissed),
    );

    this.audio.syncBreachMoneyChime({
      active: this.state.phase === GamePhase.Breaching,
      level01: getBreachMoneyChimeLevel01(this.state),
    });

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
