import { debounce, DisplayTrack, getSortedTracks, sleep } from '../utils';
import { createEmptyWave } from '../create-empty-wave';
import { control } from '../redux/actions';
import { AppStore, AppSubscribe, AppGetState } from '../redux/store';
import { Dispatch } from '@reduxjs/toolkit';

export interface MediaSessionService {
    init(): Promise<void>;
}

export class BrowserMediaSessionService {
    private initialized = false;
    private audioEl?: HTMLAudioElement;

    private dispatch: Dispatch<any>; // CAVEAT: AppDispatch type doesn't have an overload for redux thunk actions
    private subscribe: AppSubscribe;
    private getState: AppGetState;

    constructor(appStore: AppStore) {
        this.dispatch = appStore.dispatch.bind(appStore) as Dispatch<any>;
        this.subscribe = appStore.subscribe.bind(appStore);
        this.getState = appStore.getState.bind(appStore);
    }

    async init() {
        if (this.initialized || !navigator.mediaSession) {
            return;
        }
        this.initialized = true;

        // Audio el
        const audioEl = document.createElement('audio');
        audioEl.id = 'browser-media-session-helper';
        document.body.appendChild(audioEl);

        audioEl.setAttribute('loop', 'true');
        audioEl.src = URL.createObjectURL(createEmptyWave(6));
        audioEl.volume = 0;

        this.audioEl = audioEl;

        // Blocks media session events during initialization
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.metadata = null;

        audioEl.play();
        await sleep(5000); // CAVEAT: 5secs is the minimum playing time for media info to show up
        audioEl.pause();

        if (this.getState().main.deviceStatus?.state === 'playing') {
            // restore current state
            audioEl.play();
        }

        console.log('MediaSession ready');

        // Set mediaSession event handlers
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            this.dispatch(control('prev'));
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            this.dispatch(control('next'));
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            audioEl.pause();
            this.dispatch(control('pause'));
        });
        navigator.mediaSession.setActionHandler('play', () => {
            audioEl.play();
            this.dispatch(control('play'));
        });

        const debouncedSeek = debounce((time: number, trackNumber: number) => {
            this.dispatch(control('seek', { time, trackNumber }));
            audioEl.currentTime = time;
        }, 100);

        navigator.mediaSession.setActionHandler('seekto', details => {
            const trackNumber = this.getState().main.deviceStatus?.track ?? -1;
            if (trackNumber === -1 || details.seekTime === null) {
                return; // can't seek without knowing the track number or the seek time
            }
            debouncedSeek(details.seekTime, trackNumber);
        });

        this.subscribe(() => {
            this.syncState();
        });
    }

    syncState() {
        if (!this.initialized) {
            return;
        }

        const audioEl = this.audioEl!;
        const {
            main: { deviceStatus, disc },
        } = this.getState();

        const isPlaying = deviceStatus?.state === 'playing';
        const currentDiscTitle = disc?.title;
        const currentTrackIndex = deviceStatus?.track ?? -1;
        const allTracks = getSortedTracks(disc);
        const currentTrack: DisplayTrack | undefined = allTracks[currentTrackIndex];
        const currentTrackTitle = currentTrack ? currentTrack.fullWidthTitle || currentTrack?.title : '';
        const currentTrackDurationInSecs = Math.round(currentTrack?.durationInSecs ?? -1);

        const oldTrackTitle = navigator.mediaSession.metadata?.title;
        const oldDiscTitle = navigator.mediaSession.metadata?.album;

        // Sync MmediaSession
        if (isPlaying && navigator.mediaSession.playbackState !== 'playing') {
            navigator.mediaSession.playbackState = 'playing';
        } else if (!isPlaying && navigator.mediaSession.playbackState !== 'paused') {
            navigator.mediaSession.playbackState = 'paused';
        }

        // Sync MediaMetadata
        if (oldTrackTitle !== currentTrackTitle || oldDiscTitle !== currentDiscTitle) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrackTitle,
                album: currentDiscTitle,
                artwork: [
                    { src: window.location.pathname + 'MiniDisc192.png', sizes: '192x192', type: 'image/png' },
                    { src: window.location.pathname + 'MiniDisc512.png', sizes: '512x512', type: 'image/png' },
                ],
            });
        }

        // Sync audio duration.
        // CAVEAT: replacing the src may change the audioEl paused state.
        if (audioEl && audioEl.duration !== currentTrackDurationInSecs && isPlaying) {
            URL.revokeObjectURL(audioEl.src ?? '');
            audioEl.src = URL.createObjectURL(createEmptyWave(Math.max(currentTrackDurationInSecs, 1)));
        }

        // Sync <audio> state
        if (isPlaying && audioEl.paused) {
            audioEl.play();
        } else if (!isPlaying && !audioEl.paused) {
            audioEl.pause();
        }
    }
}
