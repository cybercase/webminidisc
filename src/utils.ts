import { Disc, formatTimeFromFrames, Encoding } from 'netmd-js';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from './redux/store';
import { Mutex } from 'async-mutex';
import { Theme } from '@material-ui/core';
import jconv from 'jconv';

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

export function sanitizeHalfWidthTitle(title: string) {
    if (title.length > 120) title = title.substring(0, 120);

    const mappings: { [key: string]: string } = { 'ァ': 'ｧ', 'ア': 'ｱ', 'ィ': 'ｨ', 'イ': 'ｲ', 'ゥ': 'ｩ', 'ウ': 'ｳ', 'ェ': 'ｪ', 'エ': 'ｴ', 'ォ': 'ｫ', 'オ': 'ｵ', 'カ': 'ｶ', 'ガ': 'ｶﾞ', 'キ': 'ｷ', 'ギ': 'ｷﾞ', 'ク': 'ｸ', 'グ': 'ｸﾞ', 'ケ': 'ｹ', 'ゲ': 'ｹﾞ', 'コ': 'ｺ', 'ゴ': 'ｺﾞ', 'サ': 'ｻ', 'ザ': 'ｻﾞ', 'シ': 'ｼ', 'ジ': 'ｼﾞ', 'ス': 'ｽ', 'ズ': 'ｽﾞ', 'セ': 'ｾ', 'ゼ': 'ｾﾞ', 'ソ': 'ｿ', 'ゾ': 'ｿﾞ', 'タ': 'ﾀ', 'ダ': 'ﾀﾞ', 'チ': 'ﾁ', 'ヂ': 'ﾁﾞ', 'ッ': 'ｯ', 'ツ': 'ﾂ', 'ヅ': 'ﾂﾞ', 'テ': 'ﾃ', 'デ': 'ﾃﾞ', 'ト': 'ﾄ', 'ド': 'ﾄﾞ', 'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ', 'ハ': 'ﾊ', 'バ': 'ﾊﾞ', 'パ': 'ﾊﾟ', 'ヒ': 'ﾋ', 'ビ': 'ﾋﾞ', 'ピ': 'ﾋﾟ', 'フ': 'ﾌ', 'ブ': 'ﾌﾞ', 'プ': 'ﾌﾟ', 'ヘ': 'ﾍ', 'ベ': 'ﾍﾞ', 'ペ': 'ﾍﾟ', 'ホ': 'ﾎ', 'ボ': 'ﾎﾞ', 'ポ': 'ﾎﾟ', 'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ', 'ャ': 'ｬ', 'ヤ': 'ﾔ', 'ュ': 'ｭ', 'ユ': 'ﾕ', 'ョ': 'ｮ', 'ヨ': 'ﾖ', 'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ', 'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ', 'ー': 'ｰ', 'ヮ': 'ヮ', 'ヰ': 'ヰ', 'ヱ': 'ヱ', 'ヵ': 'ヵ', 'ヶ': 'ヶ', 'ヴ': 'ｳﾞ', 'ヽ': 'ヽ', 'ヾ': 'ヾ', '・': '･', '「': '｢', '」': '｣', '。': '｡', '、': '､', '！': '!', '＂': '"', '＃': '#', '＄': '$', '％': '%', '＆': '&', '＇': "'", '（': '(', '）': ')', '＊': '*', '＋': '+', '，': ',', '－': '-', '．': '.', '／': '/', '：': ':', '；': ';', '＜': '<', '＝': '=', '＞': '>', '？': '?', '＠': '@', 'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z', '［': '[', '＼': '\\', '］': ']', '＾': '^', '＿': '_', '｀': '`', 'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z', '｛': '{', '｜': '|', '｝': '}', '～': '~', '\u3000': ' ', '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9', 'ぁ': 'ｧ', 'あ': 'ｱ', 'ぃ': 'ｨ', 'い': 'ｲ', 'ぅ': 'ｩ', 'う': 'ｳ', 'ぇ': 'ｪ', 'え': 'ｴ', 'ぉ': 'ｫ', 'お': 'ｵ', 'か': 'ｶ', 'が': 'ｶﾞ', 'き': 'ｷ', 'ぎ': 'ｷﾞ', 'く': 'ｸ', 'ぐ': 'ｸﾞ', 'け': 'ｹ', 'げ': 'ｹﾞ', 'こ': 'ｺ', 'ご': 'ｺﾞ', 'さ': 'ｻ', 'ざ': 'ｻﾞ', 'し': 'ｼ', 'じ': 'ｼﾞ', 'す': 'ｽ', 'ず': 'ｽﾞ', 'せ': 'ｾ', 'ぜ': 'ｾﾞ', 'そ': 'ｿ', 'ぞ': 'ｿﾞ', 'た': 'ﾀ', 'だ': 'ﾀﾞ', 'ち': 'ﾁ', 'ぢ': 'ﾁﾞ', 'っ': 'ｯ', 'つ': 'ﾂ', 'づ': 'ﾂﾞ', 'て': 'ﾃ', 'で': 'ﾃﾞ', 'と': 'ﾄ', 'ど': 'ﾄﾞ', 'な': 'ﾅ', 'に': 'ﾆ', 'ぬ': 'ﾇ', 'ね': 'ﾈ', 'の': 'ﾉ', 'は': 'ﾊ', 'ば': 'ﾊﾞ', 'ぱ': 'ﾊﾟ', 'ひ': 'ﾋ', 'び': 'ﾋﾞ', 'ぴ': 'ﾋﾟ', 'ふ': 'ﾌ', 'ぶ': 'ﾌﾞ', 'ぷ': 'ﾌﾟ', 'へ': 'ﾍ', 'べ': 'ﾍﾞ', 'ぺ': 'ﾍﾟ', 'ほ': 'ﾎ', 'ぼ': 'ﾎﾞ', 'ぽ': 'ﾎﾟ', 'ま': 'ﾏ', 'み': 'ﾐ', 'む': 'ﾑ', 'め': 'ﾒ', 'も': 'ﾓ', 'ゃ': 'ｬ', 'や': 'ﾔ', 'ゅ': 'ｭ', 'ゆ': 'ﾕ', 'ょ': 'ｮ', 'よ': 'ﾖ', 'ら': 'ﾗ', 'り': 'ﾘ', 'る': 'ﾙ', 'れ': 'ﾚ', 'ろ': 'ﾛ', 'わ': 'ﾜ', 'を': 'ｦ', 'ん': 'ﾝ', 'ゎ': 'ヮ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'ゕ': 'ヵ', 'ゖ': 'ヶ', 'ゔ': 'ｳﾞ', 'ゝ': 'ヽ', 'ゞ': 'ヾ' };
    const multiByteChars: { [key: string]: number } = { "ガ": 1, "ギ": 1, "グ": 1, "ゲ": 1, "ゴ": 1, "ザ": 1, "ジ": 1, "ズ": 1, "ゼ": 1, "ゾ": 1, "ダ": 1, "ヂ": 1, "ヅ": 1, "デ": 1, "ド": 1, "バ": 1, "パ": 1, "ビ": 1, "ピ": 1, "ブ": 1, "プ": 1, "ベ": 1, "ペ": 1, "ボ": 1, "ポ": 1, "ヮ": 1, "ヰ": 1, "ヱ": 1, "ヵ": 1, "ヶ": 1, "ヴ": 1, "ヽ": 1, "ヾ": 1, "が": 1, "ぎ": 1, "ぐ": 1, "げ": 1, "ご": 1, "ざ": 1, "じ": 1, "ず": 1, "ぜ": 1, "ぞ": 1, "だ": 1, "ぢ": 1, "づ": 1, "で": 1, "ど": 1, "ば": 1, "ぱ": 1, "び": 1, "ぴ": 1, "ぶ": 1, "ぷ": 1, "べ": 1, "ぺ": 1, "ぼ": 1, "ぽ": 1, "ゎ": 1, "ゐ": 1, "ゑ": 1, "ゕ": 1, "ゖ": 1, "ゔ": 1, "ゝ": 1, "ゞ": 1 }; //Dakuten kana are encoded as 2 bytes
    const allowedHalfWidthKana: string[] = Object.values(mappings);

    let allowedAdditionalChars = 0;
    const newTitle = title.split('').map(n => {
        allowedAdditionalChars += (multiByteChars[n] ?? 0);
        if (mappings[n]) return mappings[n];
        if (n.charCodeAt(0) < 0x7f || allowedHalfWidthKana.includes(n)) return n;
        return ' ';
    }).join('');
    //Check if the amount of characters is the same as the amount of encoded bytes (when accounting for dakuten). Otherwise the disc might end up corrupted
    const sjisEncoded = jconv.encode(newTitle, 'SJIS');
    if (sjisEncoded.length - allowedAdditionalChars !== title.length) return sanitizeTitle(title); //Fallback
    return newTitle;
}

export function sanitizeFullWidthTitle(title: string) {
    if (title.length > 100) title = title.substring(0, 100);
    const mappings: { [key: string]: string} = {'!': '！', '"': '＂', '#': '＃', '$': '＄', '%': '％', '&': '＆', "'": '＇', '(': '（', ')': '）', '*': '＊', '+': '＋', ',': '，', '-': '－', '.': '．', '/': '／', ':': '：', ';': '；', '<': '＜', '=': '＝', '>': '＞', '?': '？', '@': '＠', 'A': 'Ａ', 'B': 'Ｂ', 'C': 'Ｃ', 'D': 'Ｄ', 'E': 'Ｅ', 'F': 'Ｆ', 'G': 'Ｇ', 'H': 'Ｈ', 'I': 'Ｉ', 'J': 'Ｊ', 'K': 'Ｋ', 'L': 'Ｌ', 'M': 'Ｍ', 'N': 'Ｎ', 'O': 'Ｏ', 'P': 'Ｐ', 'Q': 'Ｑ', 'R': 'Ｒ', 'S': 'Ｓ', 'T': 'Ｔ', 'U': 'Ｕ', 'V': 'Ｖ', 'W': 'Ｗ', 'X': 'Ｘ', 'Y': 'Ｙ', 'Z': 'Ｚ', '[': '［', '\\': '＼', ']': '］', '^': '＾', '_': '＿', '`': '｀', 'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ', 'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ', 'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ', 's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ', 'y': 'ｙ', 'z': 'ｚ', '{': '｛', '|': '｜', '}': '｝', '~': '～', ' ': '\u3000', '0': '０', '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６', '7': '７', '8': '８', '9': '９', 'ｧ': 'ァ', 'ｱ': 'ア', 'ｨ': 'ィ', 'ｲ': 'イ', 'ｩ': 'ゥ', 'ｳ': 'ウ', 'ｪ': 'ェ', 'ｴ': 'エ', 'ｫ': 'ォ', 'ｵ': 'オ', 'ｶ': 'カ', 'ｶﾞ': 'ガ', 'ｷ': 'キ', 'ｷﾞ': 'ギ', 'ｸ': 'ク', 'ｸﾞ': 'グ', 'ｹ': 'ケ', 'ｹﾞ': 'ゲ', 'ｺ': 'コ', 'ｺﾞ': 'ゴ', 'ｻ': 'サ', 'ｻﾞ': 'ザ', 'ｼ': 'シ', 'ｼﾞ': 'ジ', 'ｽ': 'ス', 'ｽﾞ': 'ズ', 'ｾ': 'セ', 'ｾﾞ': 'ゼ', 'ｿ': 'ソ', 'ｿﾞ': 'ゾ', 'ﾀ': 'タ', 'ﾀﾞ': 'ダ', 'ﾁ': 'チ', 'ﾁﾞ': 'ヂ', 'ｯ': 'ッ', 'ﾂ': 'ツ', 'ﾂﾞ': 'ヅ', 'ﾃ': 'テ', 'ﾃﾞ': 'デ', 'ﾄ': 'ト', 'ﾄﾞ': 'ド', 'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ', 'ﾊ': 'ハ', 'ﾊﾞ': 'バ', 'ﾊﾟ': 'パ', 'ﾋ': 'ヒ', 'ﾋﾞ': 'ビ', 'ﾋﾟ': 'ピ', 'ﾌ': 'フ', 'ﾌﾞ': 'ブ', 'ﾌﾟ': 'プ', 'ﾍ': 'ヘ', 'ﾍﾞ': 'ベ', 'ﾍﾟ': 'ペ', 'ﾎ': 'ホ', 'ﾎﾞ': 'ボ', 'ﾎﾟ': 'ポ', 'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ', 'ｬ': 'ャ', 'ﾔ': 'ヤ', 'ｭ': 'ュ', 'ﾕ': 'ユ', 'ｮ': 'ョ', 'ﾖ': 'ヨ', 'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ', 'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン', 'ｰ': 'ー', 'ヮ': 'ヮ', 'ヰ': 'ヰ', 'ヱ': 'ヱ', 'ヵ': 'ヵ', 'ヶ': 'ヶ', 'ｳﾞ': 'ヴ', 'ヽ': 'ヽ', 'ヾ': 'ヾ', '･': '・', '｢': '「', '｣': '」', '｡': '。', '､': '、'};

    const newTitle = title.split('').map(n => mappings[n] ?? n).join('');
    
    const sjisEncoded = jconv.encode(newTitle, 'SJIS');
    if(jconv.decode(sjisEncoded, 'SJIS') !== newTitle) return sanitizeTitle(title); //Fallback
    return newTitle; 
}

const EncodingName: { [k: number]: string } = {
    [Encoding.sp]: 'SP',
    [Encoding.lp2]: 'LP2',
    [Encoding.lp4]: 'LP4',
};

export function getSortedTracks(disc: Disc | null) {
    let tracks: { index: number; title: string; fullWidthTitle: string; group: string; duration: string; encoding: string }[] = [];
    if (disc !== null) {
        for (let group of disc.groups) {
            for (let track of group.tracks) {
                tracks.push({
                    index: track.index,
                    title: track.title ?? `Unknown Title`,
                    fullWidthTitle: track.fullWidthTitle ?? ``,
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

export function askNotificationPermission(): Promise<NotificationPermission> {
    // Adapted from: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
    function checkNotificationPromise() {
        try {
            Notification.requestPermission().then();
        } catch (e) {
            return false;
        }
        return true;
    }

    if (checkNotificationPromise()) {
        return Notification.requestPermission();
    } else {
        return new Promise(resolve => Notification.requestPermission(resolve));
    }
}

declare let process: any;
