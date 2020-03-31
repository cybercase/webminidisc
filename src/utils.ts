import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from './redux/store';

export function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

export function useShallowEqualSelector<TState = RootState, TSelected = unknown>(selector: (state: TState) => TSelected): TSelected {
    return useSelector(selector, shallowEqual);
}

export function hasWebUSB(): boolean {
    return !!navigator.usb;
}

export function getWebUSB(): USB {
    return navigator.usb;
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

declare let process: any;
