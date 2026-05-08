const MUSIC_MUTED_KEY = 'grumpiest_catch_music_muted_v1';

export function readMusicMutedStorage(): boolean {
  try {
    return localStorage.getItem(MUSIC_MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMusicMutedStorage(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUSIC_MUTED_KEY, '1');
    else localStorage.removeItem(MUSIC_MUTED_KEY);
  } catch {
    /* quota / private mode */
  }
}
