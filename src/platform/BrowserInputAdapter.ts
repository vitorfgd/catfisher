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
  private isBoatPhase = true;
  private upgradePanelOpen: keyof UpgradeState | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setPhase(isBoat: boolean): void {
    this.isBoatPhase = isBoat;
    if (!isBoat) this.upgradePanelOpen = null;
  }

  setBoatUiState(upgradePanelOpen: keyof UpgradeState | null): void {
    this.upgradePanelOpen = upgradePanelOpen;
  }

  drainCommands(): GameInputCommand[] {
    return this.commands.splice(0);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    const { x, y } = clientToLogical(event.clientX, event.clientY, this.canvas);

    if (this.isBoatPhase) {
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

    // Action phase — check consumable use zones first
    const useId = getHudConsumableUseHit(x, y);
    if (useId !== null) {
      this.commands.push({ type: 'useConsumable', id: useId });
      return;
    }

    this.commands.push({ type: 'tap', x, y });
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }
}
