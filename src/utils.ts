import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from './redux/store';

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

declare let process: any;
