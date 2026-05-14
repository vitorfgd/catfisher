// Browser-only input adapter. Do not import from core/.
// @GUARD: The clientToLogical math handles aspect-ratio scaling correctly.

import type { InputAdapter, GameInputCommand } from './GameEvents';
import type { UpgradeState } from '../core/Types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../core/Constants';
import {
  getBoatConsumableBuyHit,
  getHudConsumableUseHit,
  getUpgradeKeyByPoint,
  isDiveButton,
  isUpgradePanelBuyButton,
} from '../shared/UiLayout';
import {
  isBoatLeaderboardFabHit,
  isLeaderboardModalCloseHit,
} from '../shared/LeaderboardOverlayLayout';

const HARPOON_FIRE_VOLUME = 0.1;
const HARPOON_FIRE_VOICES = 4;

function clientToLogical(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export class BrowserInputAdapter implements InputAdapter {
  private readonly commands: GameInputCommand[] = [];
  private readonly harpoonFireVoices: HTMLAudioElement[] = [];
  private harpoonFireVoiceIx = 0;
  private isBoatPhase = true;
  private upgradePanelOpen: keyof UpgradeState | null = null;
  private boatLeaderboardOpen = false;
  private breachAwaitingConfirm = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    harpoonFireSrc?: string,
    private readonly canPlayHarpoonFire: () => boolean = () => true,
  ) {
    if (harpoonFireSrc != null && harpoonFireSrc !== '') {
      for (let i = 0; i < HARPOON_FIRE_VOICES; i += 1) {
        const clip = new Audio(harpoonFireSrc);
        clip.volume = HARPOON_FIRE_VOLUME;
        clip.preload = 'auto';
        clip.load();
        this.harpoonFireVoices.push(clip);
      }
      window.addEventListener('pointerdown', this.primeHarpoonFire, { once: true, passive: true, capture: true });
      window.addEventListener('keydown', this.primeHarpoonFire, { once: true, capture: true });
    }
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setPhase(isBoat: boolean): void {
    this.isBoatPhase = isBoat;
    if (!isBoat) {
      this.upgradePanelOpen = null;
      this.boatLeaderboardOpen = false;
    } else {
      this.breachAwaitingConfirm = false;
    }
  }

  setBoatUiState(upgradePanelOpen: keyof UpgradeState | null, boatLeaderboardOpen: boolean): void {
    this.upgradePanelOpen = upgradePanelOpen;
    this.boatLeaderboardOpen = boatLeaderboardOpen;
  }

  setBreachingAwaitingConfirm(active: boolean): void {
    this.breachAwaitingConfirm = active;
  }

  drainCommands(): GameInputCommand[] {
    return this.commands.splice(0);
  }

  private readonly primeHarpoonFire = (): void => {
    const clip = this.harpoonFireVoices[0];
    if (clip == null) return;
    try {
      clip.muted = true;
      void clip.play().then(() => {
        clip.pause();
        clip.currentTime = 0;
        clip.muted = false;
        clip.volume = HARPOON_FIRE_VOLUME;
      }).catch(() => {
        clip.muted = false;
      });
    } catch {
      clip.muted = false;
    }
  };

  private playHarpoonFire(): void {
    const clip = this.harpoonFireVoices[this.harpoonFireVoiceIx % this.harpoonFireVoices.length];
    this.harpoonFireVoiceIx += 1;
    if (clip == null) return;
    try {
      clip.pause();
      clip.currentTime = 0;
      clip.muted = false;
      clip.volume = HARPOON_FIRE_VOLUME;
    } catch {
      // Continue into play(); browsers may still accept playback even if seeking failed.
    }
    void clip.play().catch((error: unknown) => {
      console.warn('[audio] harpoon-fire failed to play', error);
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    const { x, y } = clientToLogical(event.clientX, event.clientY, this.canvas);

    if (this.isBoatPhase) {
      if (this.boatLeaderboardOpen) {
        if (isLeaderboardModalCloseHit(x, y)) {
          this.commands.push({ type: 'closeBoatLeaderboard' });
        }
        return;
      }

      if (this.upgradePanelOpen !== null) {
        // Full-screen panel is open — buy button or any other tap closes
        if (isUpgradePanelBuyButton(x, y)) {
          this.commands.push({ type: 'buyUpgrade', id: this.upgradePanelOpen });
          return;
        }
        // Any other tap → close panel
        const closingId = this.upgradePanelOpen;
        this.upgradePanelOpen = null;
        this.commands.push({ type: 'openUpgradePanel', id: closingId });
        return;
      }

      // Panel is closed — normal boat routing
      if (isDiveButton(x, y)) {
        this.commands.push({ type: 'divePress' });
        return;
      }

      if (isBoatLeaderboardFabHit(x, y)) {
        this.commands.push({ type: 'openBoatLeaderboard' });
        return;
      }

      const upgradeId = getUpgradeKeyByPoint(x, y);
      if (upgradeId !== null) {
        this.upgradePanelOpen = upgradeId;
        this.commands.push({ type: 'openUpgradePanel', id: upgradeId });
        return;
      }

      const consumableId = getBoatConsumableBuyHit(x, y);
      if (consumableId !== null) {
        this.commands.push({ type: 'buyConsumable', id: consumableId });
      }
      return;
    }

    if (this.breachAwaitingConfirm) {
      this.commands.push({ type: 'breachEndScreenTap' });
      return;
    }

    // Action phase — check consumable use zones first
    const useId = getHudConsumableUseHit(x, y);
    if (useId !== null) {
      this.commands.push({ type: 'useConsumable', id: useId });
      return;
    }

    if (this.canPlayHarpoonFire()) {
      this.playHarpoonFire();
    }
    this.commands.push({ type: 'tap', x, y });
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerdown', this.primeHarpoonFire, { capture: true });
    window.removeEventListener('keydown', this.primeHarpoonFire, { capture: true });
  }
}
