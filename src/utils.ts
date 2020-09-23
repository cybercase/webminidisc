import { Disc, formatTimeFromFrames, Encoding } from 'netmd-js';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from './redux/store';
import { Mutex } from 'async-mutex';
import { Theme } from '@material-ui/core';

export function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

export async function sleepWithProgressCallback(ms: number, cb: (perc: number) => void) {
    let elapsedSecs = 1;
    let interval = setInterval(() => {
        elapsedSecs++;
        cb(Math.min(100, ((elapsedSecs * 1000) / ms) * 100));
    }, 1000);
    await sleep(ms);
    window.clearInterval(interval);
}

export function useShallowEqualSelector<TState = RootState, TSelected = unknown>(selector: (state: TState) => TSelected): TSelected {
    return useSelector(selector, shallowEqual);
}

export function debugEnabled() {
    return process.env.NODE_ENV === 'development';
}

export function getPublicPathFor(script: string) {
    return `${process.env.PUBLIC_URL}/${script}`;
}

export function savePreference(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function loadPreference<T>(key: string, defaultValue: T): T {
    let res = localStorage.getItem(key);
    if (res === null) {
        return defaultValue;
    } else {
        try {
            return JSON.parse(res) as T;
        } catch (e) {
            return defaultValue;
        }
    }
}

export function getAvailableCharsForTrackTitle(trackTitles: string[]) {
    const maxChars = 1700; // see https://www.minidisc.org/md_toc.html
    const usedChars = trackTitles.reduce((acc, title) => {
        return acc + title.length;
    }, 0);
    return maxChars - usedChars;
}

export function framesToSec(frames: number) {
    return frames / 512;
}

export function sanitizeTitle(title: string) {
    return title.normalize('NFD').replace(/[^\x00-\x7F]/g, '');
}

const EncodingName: { [k: number]: string } = {
    [Encoding.sp]: 'SP',
    [Encoding.lp2]: 'LP2',
    [Encoding.lp4]: 'LP4',
};

export function getSortedTracks(disc: Disc | null) {
    let tracks: { index: number; title: string; group: string; duration: string; encoding: string }[] = [];
    if (disc !== null) {
        for (let group of disc.groups) {
            for (let track of group.tracks) {
                tracks.push({
                    index: track.index,
                    title: track.title ?? `Unknown Title`,
                    group: group.title ?? ``,
                    encoding: EncodingName[track.encoding],
                    duration: formatTimeFromFrames(track.duration, false),
                });
            }
        }
    }
    tracks.sort((l, r) => l.index - r.index);
    return tracks;
}

export function asyncMutex(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // This is meant to be used only with classes having a "mutex" instance property
    const oldValue = descriptor.value;
    descriptor.value = async function(...args: any) {
        const mutex = (this as any).mutex as Mutex;
        const release = await mutex.acquire();
        try {
            return await oldValue.apply(this, args);
        } finally {
            release();
        }
    };
    return descriptor;
}

export function forAnyDesktop(theme: Theme) {
    return theme.breakpoints.up(600 + theme.spacing(2) * 2);
}

export function belowDesktop(theme: Theme) {
    return theme.breakpoints.down(600 + theme.spacing(2) * 2);
}

export function forWideDesktop(theme: Theme) {
    return theme.breakpoints.up(700 + theme.spacing(2) * 2) + ` and (min-height: 750px)`;
}

declare let process: any;
