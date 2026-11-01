import { describe, it, expect } from 'vitest';
import { formatTime, resolveSource, wave } from '../../../app/lib/azel/voice-source';

describe('resolveSource', () => {
  it('streams a direct file as is', () => {
    expect(resolveSource('https://vps.test/r1.mp3')).toEqual({ kind: 'file', src: 'https://vps.test/r1.mp3' });
  });

  it('streams a Google Drive share link, with Drive’s player as the fallback', () => {
    const source = resolveSource('https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing');
    expect(source).toMatchObject({
      kind: 'drive',
      src: 'https://drive.google.com/uc?export=download&id=1AbCdEfGhIjK',
      embed: 'https://drive.google.com/file/d/1AbCdEfGhIjK/preview',
    });
  });

  it('asks Dropbox for the raw file', () => {
    expect(resolveSource('https://www.dropbox.com/s/x/a.m4a?dl=0')?.src).toBe(
      'https://www.dropbox.com/s/x/a.m4a?raw=1'
    );
  });

  it('plays a SoundCloud track through its widget, unwrapping a pasted widget link', () => {
    const direct = resolveSource('https://soundcloud.com/u/track');
    const pasted = resolveSource(
      'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fu%2Ftrack'
    );
    expect(direct?.kind).toBe('soundcloud');
    expect(new URL(direct!.embed!).searchParams.get('url')).toBe('https://soundcloud.com/u/track');
    expect(new URL(pasted!.embed!).searchParams.get('url')).toBe('https://soundcloud.com/u/track');
  });

  it('has nothing for an empty link', () => {
    expect(resolveSource('  ')).toBeNull();
  });
});

describe('wave', () => {
  it('draws the same 44 bars for the same reviewer', () => {
    expect(wave('سارة1')).toEqual(wave('سارة1'));
    expect(wave('سارة1')).not.toEqual(wave('سارة2'));
    expect(wave('x')).toHaveLength(44);
    expect(Math.max(...wave('x'))).toBeLessThanOrEqual(100);
  });
});

describe('formatTime', () => {
  it('reads minutes and seconds, and 0:00 before the duration is known', () => {
    expect(formatTime(75.4)).toBe('1:15');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
});
