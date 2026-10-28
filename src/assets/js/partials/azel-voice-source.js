/**
 * AZEL — voice-review sources.
 * ---------------------------------------------------------------------------
 * The merchant pastes one link per review. Whatever it is, the design's
 * waveform player drives it through the same small interface:
 *
 *   player.play() / player.pause() / player.seek(0..1)
 *   player.on('time', ({ current, duration }))   seconds
 *   player.on('play' | 'pause' | 'end' | 'error' | 'fallback')
 *
 * Supported links:
 *   direct file   https://vps.example.com/reviews/r1.mp3 (mp3, m4a, ogg, wav…)
 *   Google Drive  https://drive.google.com/file/d/<id>/view?usp=sharing
 *                 (shared as "anyone with the link"). Streamed as a file; if
 *                 Google refuses to stream it, Drive's own player is shown.
 *   Dropbox       https://www.dropbox.com/…?dl=0 → streamed with raw=1
 *   SoundCloud    https://soundcloud.com/<user>/<track>. Played through
 *                 SoundCloud's official widget API in a hidden iframe; if it
 *                 does not start, SoundCloud's own small player is shown.
 */

const SC_API = 'https://w.soundcloud.com/player/api.js';
let scApi = null;

function loadSoundCloudApi() {
    if (window.SC?.Widget) return Promise.resolve(window.SC);
    if (scApi) return scApi;
    scApi = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SC_API;
        s.async = true;
        s.onload = () => (window.SC?.Widget ? resolve(window.SC) : reject(new Error('SoundCloud API missing')));
        s.onerror = () => { scApi = null; reject(new Error('SoundCloud API failed to load')); };
        document.head.append(s);
    });
    return scApi;
}

/** What kind of link the merchant pasted, and how to reach it. */
export function resolveSource(raw) {
    const url = String(raw || '').trim();
    if (!url) return null;
    let u;
    try { u = new URL(url, location.href); } catch (e) { return { kind: 'file', src: url }; }
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'drive.google.com' || host === 'docs.google.com') {
        const id = (u.pathname.match(/\/d\/([\w-]{10,})/) || [])[1] || u.searchParams.get('id');
        if (id) {
            return {
                kind: 'drive',
                src: `https://drive.google.com/uc?export=download&id=${id}`,
                embed: `https://drive.google.com/file/d/${id}/preview`,
                embedHeight: 60,
            };
        }
    }
    if (host === 'dropbox.com' || host === 'dl.dropboxusercontent.com') {
        u.searchParams.delete('dl');
        u.searchParams.set('raw', '1');
        return { kind: 'file', src: u.toString() };
    }
    if (host === 'soundcloud.com' || host === 'm.soundcloud.com' || host === 'on.soundcloud.com' || host === 'api.soundcloud.com' || host === 'w.soundcloud.com') {
        // a pasted widget link carries the track in its own ?url=
        const track = host === 'w.soundcloud.com' ? (u.searchParams.get('url') || url) : url;
        const params = new URLSearchParams({
            url: track, color: '#C8E115', auto_play: 'false', hide_related: 'true', show_comments: 'false',
            show_user: 'false', show_reposts: 'false', show_teaser: 'false', visual: 'false', buying: 'false', sharing: 'false', download: 'false',
        });
        return { kind: 'soundcloud', embed: `https://w.soundcloud.com/player/?${params}`, embedHeight: 120 };
    }
    return { kind: 'file', src: url };
}

function emitter() {
    const map = {};
    return {
        on(type, fn) { (map[type] = map[type] || []).push(fn); },
        emit(type, data) { (map[type] || []).forEach((fn) => { try { fn(data); } catch (e) { /* listener */ } }); },
    };
}

/** <audio> for direct files, Drive and Dropbox. */
function audioPlayer(source) {
    const ev = emitter();
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = source.src;
    const time = () => ev.emit('time', { current: audio.currentTime, duration: audio.duration });
    audio.addEventListener('loadedmetadata', time);
    audio.addEventListener('timeupdate', time);
    audio.addEventListener('play', () => ev.emit('play'));
    audio.addEventListener('pause', () => ev.emit('pause'));
    audio.addEventListener('ended', () => { audio.currentTime = 0; time(); ev.emit('end'); });
    // Drive sometimes refuses to stream (quota, virus-scan page): its own
    // player is the fallback; any other source has no fallback
    audio.addEventListener('error', () => ev.emit(source.embed ? 'fallback' : 'error'));
    return {
        ...ev,
        play: () => audio.play().catch(() => {}),
        pause: () => audio.pause(),
        seek: (p) => { if (audio.duration) { audio.currentTime = Math.max(0, Math.min(1, p)) * audio.duration; time(); } },
        paused: () => audio.paused,
    };
}

/** SoundCloud's widget API in an invisible iframe, driven by the design's buttons. */
function soundCloudPlayer(source, host) {
    const ev = emitter();
    let widget = null, duration = 0, paused = true, wantPlay = false, watchdog = null;

    const frame = document.createElement('iframe');
    frame.className = 'vc-sc-frame';
    frame.src = source.embed;
    frame.allow = 'autoplay; encrypted-media';
    frame.title = 'SoundCloud';
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('aria-hidden', 'true');
    host.append(frame);

    loadSoundCloudApi().then((SC) => {
        widget = SC.Widget(frame);
        const E = SC.Widget.Events;
        widget.bind(E.READY, () => {
            widget.getDuration((ms) => { duration = (ms || 0) / 1000; ev.emit('time', { current: 0, duration }); });
            if (wantPlay) widget.play();
        });
        widget.bind(E.PLAY_PROGRESS, (e) => ev.emit('time', { current: (e.currentPosition || 0) / 1000, duration }));
        widget.bind(E.PLAY, () => { paused = false; clearTimeout(watchdog); ev.emit('play'); });
        widget.bind(E.PAUSE, () => { paused = true; ev.emit('pause'); });
        widget.bind(E.FINISH, () => { paused = true; widget.seekTo(0); ev.emit('time', { current: 0, duration }); ev.emit('end'); });
        widget.bind(E.ERROR, () => ev.emit('fallback'));
    }).catch(() => ev.emit('fallback'));

    return {
        ...ev,
        play() {
            wantPlay = true;
            if (widget) widget.play();
            // a browser that blocks playback inside the hidden frame gets
            // SoundCloud's own player instead of a silent button
            clearTimeout(watchdog);
            watchdog = setTimeout(() => { if (paused) ev.emit('fallback'); }, 3500);
        },
        pause() { wantPlay = false; clearTimeout(watchdog); widget?.pause(); },
        seek(p) { if (widget && duration) widget.seekTo(Math.max(0, Math.min(1, p)) * duration * 1000); },
        paused: () => paused,
        frame,
    };
}

export function createPlayer(source, host) {
    if (!source) return null;
    return source.kind === 'soundcloud' ? soundCloudPlayer(source, host) : audioPlayer(source);
}
