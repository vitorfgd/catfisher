import { describe, expect, it } from 'vitest';
import { UPGRADE_MAX_LEVEL } from '../core/Constants';
import { UPGRADE_LEVEL_NAMES, UPGRADE_LEVEL_SPRITES } from './upgradePresentation';

describe('upgrade presentation data', () => {
  it('has one name and sprite per reachable upgrade level', () => {
    for (const id of ['speargun', 'haul', 'oxygen'] as const) {
      expect(UPGRADE_LEVEL_NAMES[id]).toHaveLength(UPGRADE_MAX_LEVEL);
      expect(UPGRADE_LEVEL_SPRITES[id]).toHaveLength(UPGRADE_MAX_LEVEL);
    }
  });
});
