import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { AzLink } from '../../azel/AzLink';
import { Icon, Stars } from '../../azel/Icon';
import { useNum } from '../../azel/useAzel';
import { collection, linkUrl } from '../../../lib/azel/utils';
import {
  createPlayer,
  formatTime,
  resolveSource,
  wave,
  type VoicePlayer,
  type VoiceTime,
} from '../../../lib/azel/voice-source';
import type { BlockProps } from './types';

interface VoiceItem {
  name?: string;
  city?: string;
  product_label?: string;
  product_url?: unknown;
  rating?: number | string;
  audio?: string;
}

/** Only one review plays at a time: starting one pauses the rest of the page's. */
const players = new Set<VoicePlayer>();

function VoiceCard({ item, seed, index }: { item: VoiceItem; seed: string; index: number }) {
  const { t, isRTL } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VoicePlayer | null>(null);
  const source = useMemo(() => resolveSource(item.audio), [item.audio]);
  const bars = useMemo(() => wave(`${seed}${index + 1}`), [seed, index]);
  const [time, setTime] = useState<VoiceTime>({ current: 0, duration: Number.NaN });
  const [playing, setPlaying] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [unavailable, setUnavailable] = useState(!source);

  // Created in an effect: the audio element and the SoundCloud frame are browser only.
  useEffect(() => {
    const host = hostRef.current;
    if (!source || !host) return;

    const start = () => {
      if (playerRef.current) return;
      const player = createPlayer(source, host);
      if (!player) return;
      playerRef.current = player;
      players.add(player);
      player.on('time', (next) => next && setTime(next));
      player.on('play', () => setPlaying(true));
      player.on('pause', () => setPlaying(false));
      player.on('end', () => {
        setPlaying(false);
        setTime((current) => ({ ...current, current: 0 }));
      });
      player.on('error', () => setUnavailable(true));
      // the source's own player, when the design's cannot drive it
      player.on('fallback', () => {
        players.delete(player);
        player.destroy();
        playerRef.current = null;
        setPlaying(false);
        if (source.embed) setEmbedded(true);
        else setUnavailable(true);
      });
    };

    // SoundCloud loads an iframe: only once the card is near the screen, so it
    // is ready (duration shown) before the visitor presses play
    let io: IntersectionObserver | undefined;
    if (source.kind === 'soundcloud' && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            start();
          }
        },
        { rootMargin: '300px' }
      );
      io.observe(host);
    } else {
      start();
    }

    return () => {
      io?.disconnect();
      const player = playerRef.current;
      if (player) {
        players.delete(player);
        player.destroy();
        playerRef.current = null;
      }
    };
  }, [source]);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused()) {
      players.forEach((other) => {
        if (other !== player) other.pause();
      });
      player.play();
    } else {
      player.pause();
    }
  };

  const seekBy = (seconds: number) => {
    if (time.duration) playerRef.current?.seek((time.current + seconds) / time.duration);
  };

  const onWaveClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // RTL: progress grows from the right
    playerRef.current?.seek(isRTL ? (r.right - e.clientX) / r.width : (e.clientX - r.left) / r.width);
  };

  const onWaveKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const forward = isRTL ? 'ArrowLeft' : 'ArrowRight';
    const back = isRTL ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) seekBy(5);
    else if (e.key === back) seekBy(-5);
    else if (e.key === ' ' || e.key === 'Enter') toggle();
    else return;
    e.preventDefault();
  };

  const progress = time.duration ? time.current / time.duration : 0;
  const lit = Math.round(progress * bars.length);
  const rating = Number(item.rating) || 0;
  const label = unavailable
    ? t('azel.voice.soon')
    : !playing && !time.current
      ? formatTime(time.duration)
      : formatTime(time.current);

  return (
    <article
      ref={hostRef as never}
      className={`voice-card${playing ? ' playing' : ''}${embedded ? ' embedded' : ''}${unavailable ? ' unavailable' : ''}`}
    >
      <header className="vc-head">
        <span className="avatar">{Array.from((item.name ?? '').trim())[0] ?? ''}</span>
        <div className="vc-who">
          <b>{item.name}</b>
          <span>
            {item.city}
            {item.city && item.product_label && ' · '}
            {item.product_label && <AzLink href={linkUrl(item.product_url)}>{item.product_label}</AzLink>}
          </span>
        </div>
        {rating > 0 && <Stars rating={rating} />}
      </header>
      <div className="vc-player" hidden={embedded}>
        <button
          type="button"
          className="vc-play"
          disabled={unavailable}
          aria-label={playing ? t('azel.voice.pause') : t('azel.voice.play')}
          onClick={toggle}
        >
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <div
          className="vc-wave"
          role="slider"
          tabIndex={0}
          aria-label={t('azel.voice.position')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onClick={onWaveClick}
          onKeyDown={onWaveKey}
        >
          {bars.map((height, i) => (
            <i key={i} className={i < lit ? 'on' : undefined} style={{ height: `${height}%` }} />
          ))}
        </div>
        <span className="vc-time num">{label}</span>
      </div>
      <div className="vc-embed" hidden={!embedded}>
        {embedded && source?.embed && (
          <iframe
            src={source.embed}
            height={Number(source.embedHeight) || 120}
            allow="autoplay; encrypted-media"
            loading="lazy"
            title={item.name ?? ''}
          />
        )}
      </div>
    </article>
  );
}

/**
 * `home.azel-voice`: voice reviews with the design's waveform player. An item
 * without audio is skipped, and the section hides when none is left.
 */
export const AzelVoice = memo(function AzelVoice({
  data,
}: BlockProps<{ eyebrow?: string; title?: string; subtitle?: string; items?: unknown }>) {
  const { t } = useTranslation();
  const num = useNum();
  const items = collection<VoiceItem>(data.items, 'items').filter((v) =>
    String(v.audio ?? '').trim()
  );
  if (!items.length) return null;
  return (
    <section className="section bg-green on-dark voice-section az">
      <div className="container">
        <div className="section-head">
          <div>
            {data.eyebrow && <span className="eyebrow">{data.eyebrow}</span>}
            {data.title && <h2 className="section-title">{data.title}</h2>}
            {data.subtitle && <p className="section-sub">{data.subtitle}</p>}
          </div>
          <span className="voice-count">
            <Icon name="mic" className="i-sm" />{' '}
            <b>
              {num(items.length)} {items.length === 1 ? t('azel.voice.one') : t('azel.voice.many')}
            </b>
          </span>
        </div>
        <div className="voice-grid">
          {items.map((item, i) => (
            <VoiceCard key={i} item={item} seed={item.name ?? ''} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
});
