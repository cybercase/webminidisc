import { Disc, formatTimeFromFrames, Encoding, getTracks, Group } from 'netmd-js';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from './redux/store';
import { Mutex } from 'async-mutex';
import { Theme } from '@material-ui/core';
import jconv from 'jconv';
import { halfWidthToFullWidthRange } from 'netmd-js/dist/utils';

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

export function getAvailableCharsForTitle(disc: Disc, includeGroups?: boolean) {
    const cellLimit = 255;
    // see https://www.minidisc.org/md_toc.html
    const fixLength = (len: number) => Math.ceil(len / 7);

    let groups = disc.groups.filter(n => n.title !== null);

    // Assume worst-case scenario
    let fwTitle = disc.fullWidthTitle + `0;//`;
    let hwTitle = disc.title + `0;//`;
    if (includeGroups || includeGroups === undefined)
        for (let group of groups) {
            let range = `${group.tracks[0].index + 1}${group.tracks.length - 1 !== 0 &&
                `-${group.tracks[group.tracks.length - 1].index + 1}`}//`;
            // The order of these characters doesn't matter. It's for length only
            fwTitle += group.fullWidthTitle + range;
            hwTitle += group.title + range;
        }

    let usedCells = 0;
    usedCells += fixLength(fwTitle.length * 2);
    usedCells += fixLength(getHalfWidthTitleLength(hwTitle));
    for (let trk of getTracks(disc)) {
        usedCells += fixLength((trk.fullWidthTitle?.length ?? 0) * 2);
        usedCells += fixLength(getHalfWidthTitleLength(trk.title ?? ''));
    }
    return Math.max(cellLimit - usedCells, 0) * 7;
}

export function framesToSec(frames: number) {
    return frames / 512;
}

export function sanitizeTitle(title: string) {
    return title.normalize('NFD').replace(/[^\x00-\x7F]/g, '');
}

export function getHalfWidthTitleLength(title: string) {
    // Some characters are written as 2 bytes
    // prettier-ignore
    // '\u309C': -1, '\uFF9F': -1, '\u309B': -1, '\uFF9E': -1 but when they become part of a multi byte character, it will sum up to 0
    const multiByteChars: { [key: string]: number } = { "ガ": 1, "ギ": 1, "グ": 1, "ゲ": 1, "ゴ": 1, "ザ": 1, "ジ": 1, "ズ": 1, "ゼ": 1, "ゾ": 1, "ダ": 1, "ヂ": 1, "ヅ": 1, "デ": 1, "ド": 1, "バ": 1, "パ": 1, "ビ": 1, "ピ": 1, "ブ": 1, "プ": 1, "ベ": 1, "ペ": 1, "ボ": 1, "ポ": 1, "ヮ": 1, "ヰ": 1, "ヱ": 1, "ヵ": 1, "ヶ": 1, "ヴ": 1, "ヽ": 1, "ヾ": 1, "が": 1, "ぎ": 1, "ぐ": 1, "げ": 1, "ご": 1, "ざ": 1, "じ": 1, "ず": 1, "ぜ": 1, "ぞ": 1, "だ": 1, "ぢ": 1, "づ": 1, "で": 1, "ど": 1, "ば": 1, "ぱ": 1, "び": 1, "ぴ": 1, "ぶ": 1, "ぷ": 1, "べ": 1, "ぺ": 1, "ぼ": 1, "ぽ": 1, "ゎ": 1, "ゐ": 1, "ゑ": 1, "ゕ": 1, "ゖ": 1, "ゔ": 1, "ゝ": 1, "ゞ": 1 };
    return (
        title.length +
        title
            .split('')
            .map(n => multiByteChars[n] ?? 0)
            .reduce((a, b) => a + b, 0)
    );
}

export function sanitizeHalfWidthTitle(title: string) {
    enum CharType {
        normal, dakuten, handakuten
    }

    const handakutenPossible = 'はひふへほハヒフヘホ'.split("");
    const dakutenPossible = "かきくけこさしすせそたちつてとカキクケコサシスセソタチツテト".split("").concat(handakutenPossible);

    //'Flatten' all the characters followed by the (han)dakuten character into one
    let dakutenFix = [];
    let type = CharType.normal;
    for (const char of sanitizeFullWidthTitle(title, true).split('').reverse()) { //This only works for full-width kana. It will get converted to half-width later anyway...
        switch (type) {
            case CharType.dakuten:
                if (dakutenPossible.includes(char)) {
                    dakutenFix.push(String.fromCharCode(char.charCodeAt(0) + 1));
                    type = CharType.normal;
                    break;
                } //Else fall through
            case CharType.handakuten:
                if (handakutenPossible.includes(char)) {
                    dakutenFix.push(String.fromCharCode(char.charCodeAt(0) + 2));
                    type = CharType.normal;
                    break;
                } //Else fall through
            case CharType.normal:
                switch (char) {
                    case '\u309B':
                    case '\u3099':
                    case '\uFF9E':
                        type = CharType.dakuten;
                        break;
                    case '\u309C':
                    case '\u309A':
                    case '\uFF9F':
                        type = CharType.handakuten;
                        break;
                    default:
                        type = CharType.normal;
                        dakutenFix.push(char);
                        break;
                }
                break;
        }
    }

    title = dakutenFix.reverse().join('');
    // prettier-ignore
    const mappings: { [key: string]: string } = { '－': '-', 'ｰ': '-', 'ァ': 'ｧ', 'ア': 'ｱ', 'ィ': 'ｨ', 'イ': 'ｲ', 'ゥ': 'ｩ', 'ウ': 'ｳ', 'ェ': 'ｪ', 'エ': 'ｴ', 'ォ': 'ｫ', 'オ': 'ｵ', 'カ': 'ｶ', 'ガ': 'ｶﾞ', 'キ': 'ｷ', 'ギ': 'ｷﾞ', 'ク': 'ｸ', 'グ': 'ｸﾞ', 'ケ': 'ｹ', 'ゲ': 'ｹﾞ', 'コ': 'ｺ', 'ゴ': 'ｺﾞ', 'サ': 'ｻ', 'ザ': 'ｻﾞ', 'シ': 'ｼ', 'ジ': 'ｼﾞ', 'ス': 'ｽ', 'ズ': 'ｽﾞ', 'セ': 'ｾ', 'ゼ': 'ｾﾞ', 'ソ': 'ｿ', 'ゾ': 'ｿﾞ', 'タ': 'ﾀ', 'ダ': 'ﾀﾞ', 'チ': 'ﾁ', 'ヂ': 'ﾁﾞ', 'ッ': 'ｯ', 'ツ': 'ﾂ', 'ヅ': 'ﾂﾞ', 'テ': 'ﾃ', 'デ': 'ﾃﾞ', 'ト': 'ﾄ', 'ド': 'ﾄﾞ', 'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ', 'ハ': 'ﾊ', 'バ': 'ﾊﾞ', 'パ': 'ﾊﾟ', 'ヒ': 'ﾋ', 'ビ': 'ﾋﾞ', 'ピ': 'ﾋﾟ', 'フ': 'ﾌ', 'ブ': 'ﾌﾞ', 'プ': 'ﾌﾟ', 'ヘ': 'ﾍ', 'ベ': 'ﾍﾞ', 'ペ': 'ﾍﾟ', 'ホ': 'ﾎ', 'ボ': 'ﾎﾞ', 'ポ': 'ﾎﾟ', 'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ', 'ャ': 'ｬ', 'ヤ': 'ﾔ', 'ュ': 'ｭ', 'ユ': 'ﾕ', 'ョ': 'ｮ', 'ヨ': 'ﾖ', 'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ', 'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ', 'ー': '-', 'ヮ': 'ヮ', 'ヰ': 'ヰ', 'ヱ': 'ヱ', 'ヵ': 'ヵ', 'ヶ': 'ヶ', 'ヴ': 'ｳﾞ', 'ヽ': 'ヽ', 'ヾ': 'ヾ', '・': '･', '「': '｢', '」': '｣', '。': '｡', '、': '､', '！': '!', '＂': '"', '＃': '#', '＄': '$', '％': '%', '＆': '&', '＇': "'", '（': '(', '）': ')', '＊': '*', '＋': '+', '，': ',', '．': '.', '／': '/', '：': ':', '；': ';', '＜': '<', '＝': '=', '＞': '>', '？': '?', '＠': '@', 'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z', '［': '[', '＼': '\\', '］': ']', '＾': '^', '＿': '_', '｀': '`', 'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z', '｛': '{', '｜': '|', '｝': '}', '～': '~', '\u3000': ' ', '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9', 'ぁ': 'ｧ', 'あ': 'ｱ', 'ぃ': 'ｨ', 'い': 'ｲ', 'ぅ': 'ｩ', 'う': 'ｳ', 'ぇ': 'ｪ', 'え': 'ｴ', 'ぉ': 'ｫ', 'お': 'ｵ', 'か': 'ｶ', 'が': 'ｶﾞ', 'き': 'ｷ', 'ぎ': 'ｷﾞ', 'く': 'ｸ', 'ぐ': 'ｸﾞ', 'け': 'ｹ', 'げ': 'ｹﾞ', 'こ': 'ｺ', 'ご': 'ｺﾞ', 'さ': 'ｻ', 'ざ': 'ｻﾞ', 'し': 'ｼ', 'じ': 'ｼﾞ', 'す': 'ｽ', 'ず': 'ｽﾞ', 'せ': 'ｾ', 'ぜ': 'ｾﾞ', 'そ': 'ｿ', 'ぞ': 'ｿﾞ', 'た': 'ﾀ', 'だ': 'ﾀﾞ', 'ち': 'ﾁ', 'ぢ': 'ﾁﾞ', 'っ': 'ｯ', 'つ': 'ﾂ', 'づ': 'ﾂﾞ', 'て': 'ﾃ', 'で': 'ﾃﾞ', 'と': 'ﾄ', 'ど': 'ﾄﾞ', 'な': 'ﾅ', 'に': 'ﾆ', 'ぬ': 'ﾇ', 'ね': 'ﾈ', 'の': 'ﾉ', 'は': 'ﾊ', 'ば': 'ﾊﾞ', 'ぱ': 'ﾊﾟ', 'ひ': 'ﾋ', 'び': 'ﾋﾞ', 'ぴ': 'ﾋﾟ', 'ふ': 'ﾌ', 'ぶ': 'ﾌﾞ', 'ぷ': 'ﾌﾟ', 'へ': 'ﾍ', 'べ': 'ﾍﾞ', 'ぺ': 'ﾍﾟ', 'ほ': 'ﾎ', 'ぼ': 'ﾎﾞ', 'ぽ': 'ﾎﾟ', 'ま': 'ﾏ', 'み': 'ﾐ', 'む': 'ﾑ', 'め': 'ﾒ', 'も': 'ﾓ', 'ゃ': 'ｬ', 'や': 'ﾔ', 'ゅ': 'ｭ', 'ゆ': 'ﾕ', 'ょ': 'ｮ', 'よ': 'ﾖ', 'ら': 'ﾗ', 'り': 'ﾘ', 'る': 'ﾙ', 'れ': 'ﾚ', 'ろ': 'ﾛ', 'わ': 'ﾜ', 'を': 'ｦ', 'ん': 'ﾝ', 'ゎ': 'ヮ', 'ゐ': 'ヰ', 'ゑ': 'ヱ', 'ゕ': 'ヵ', 'ゖ': 'ヶ', 'ゔ': 'ｳﾞ', 'ゝ': 'ヽ', 'ゞ': 'ヾ' };
    const allowedHalfWidthKana: string[] = Object.values(mappings);

    const newTitle = title
        .split('')
        .map(n => {
            if (mappings[n]) return mappings[n];
            if (n.charCodeAt(0) < 0x7f || allowedHalfWidthKana.includes(n)) return n;
            return ' ';
        })
        .join('');
    // Check if the amount of characters is the same as the amount of encoded bytes (when accounting for dakuten). Otherwise the disc might end up corrupted
    const sjisEncoded = jconv.encode(newTitle, 'SJIS');
    if (sjisEncoded.length !== getHalfWidthTitleLength(title)) return sanitizeTitle(title); //Fallback
    return newTitle;
}

export function sanitizeFullWidthTitle(title: string, justRemap: boolean = false) {
    // prettier-ignore
    const mappings: { [key: string]: string } = { '!': '！', '"': '＂', '#': '＃', '$': '＄', '%': '％', '&': '＆', "'": '＇', '(': '（', ')': '）', '*': '＊', '+': '＋', ',': '，', '-': '－', '.': '．', '/': '／', ':': '：', ';': '；', '<': '＜', '=': '＝', '>': '＞', '?': '？', '@': '＠', 'A': 'Ａ', 'B': 'Ｂ', 'C': 'Ｃ', 'D': 'Ｄ', 'E': 'Ｅ', 'F': 'Ｆ', 'G': 'Ｇ', 'H': 'Ｈ', 'I': 'Ｉ', 'J': 'Ｊ', 'K': 'Ｋ', 'L': 'Ｌ', 'M': 'Ｍ', 'N': 'Ｎ', 'O': 'Ｏ', 'P': 'Ｐ', 'Q': 'Ｑ', 'R': 'Ｒ', 'S': 'Ｓ', 'T': 'Ｔ', 'U': 'Ｕ', 'V': 'Ｖ', 'W': 'Ｗ', 'X': 'Ｘ', 'Y': 'Ｙ', 'Z': 'Ｚ', '[': '［', '\\': '＼', ']': '］', '^': '＾', '_': '＿', '`': '｀', 'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ', 'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ', 'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ', 's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ', 'y': 'ｙ', 'z': 'ｚ', '{': '｛', '|': '｜', '}': '｝', '~': '～', ' ': '\u3000', '0': '０', '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６', '7': '７', '8': '８', '9': '９', 'ｧ': 'ァ', 'ｱ': 'ア', 'ｨ': 'ィ', 'ｲ': 'イ', 'ｩ': 'ゥ', 'ｳ': 'ウ', 'ｪ': 'ェ', 'ｴ': 'エ', 'ｫ': 'ォ', 'ｵ': 'オ', 'ｶ': 'カ', 'ｶﾞ': 'ガ', 'ｷ': 'キ', 'ｷﾞ': 'ギ', 'ｸ': 'ク', 'ｸﾞ': 'グ', 'ｹ': 'ケ', 'ｹﾞ': 'ゲ', 'ｺ': 'コ', 'ｺﾞ': 'ゴ', 'ｻ': 'サ', 'ｻﾞ': 'ザ', 'ｼ': 'シ', 'ｼﾞ': 'ジ', 'ｽ': 'ス', 'ｽﾞ': 'ズ', 'ｾ': 'セ', 'ｾﾞ': 'ゼ', 'ｿ': 'ソ', 'ｿﾞ': 'ゾ', 'ﾀ': 'タ', 'ﾀﾞ': 'ダ', 'ﾁ': 'チ', 'ﾁﾞ': 'ヂ', 'ｯ': 'ッ', 'ﾂ': 'ツ', 'ﾂﾞ': 'ヅ', 'ﾃ': 'テ', 'ﾃﾞ': 'デ', 'ﾄ': 'ト', 'ﾄﾞ': 'ド', 'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ', 'ﾊ': 'ハ', 'ﾊﾞ': 'バ', 'ﾊﾟ': 'パ', 'ﾋ': 'ヒ', 'ﾋﾞ': 'ビ', 'ﾋﾟ': 'ピ', 'ﾌ': 'フ', 'ﾌﾞ': 'ブ', 'ﾌﾟ': 'プ', 'ﾍ': 'ヘ', 'ﾍﾞ': 'ベ', 'ﾍﾟ': 'ペ', 'ﾎ': 'ホ', 'ﾎﾞ': 'ボ', 'ﾎﾟ': 'ポ', 'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ', 'ｬ': 'ャ', 'ﾔ': 'ヤ', 'ｭ': 'ュ', 'ﾕ': 'ユ', 'ｮ': 'ョ', 'ﾖ': 'ヨ', 'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ', 'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン', 'ｰ': 'ー', 'ヮ': 'ヮ', 'ヰ': 'ヰ', 'ヱ': 'ヱ', 'ヵ': 'ヵ', 'ヶ': 'ヶ', 'ｳﾞ': 'ヴ', 'ヽ': 'ヽ', 'ヾ': 'ヾ', '･': '・', '｢': '「', '｣': '」', '｡': '。', '､': '、' };

    const newTitle = title
        .split('')
        .map(n => mappings[n] ?? n)
        .join('');

    if (justRemap) return newTitle;

    const sjisEncoded = jconv.encode(newTitle, 'SJIS');
    if (jconv.decode(sjisEncoded, 'SJIS') !== newTitle) return sanitizeTitle(title); // Fallback
    if (sjisEncoded.length !== title.length * 2) return sanitizeTitle(title); // Fallback (every character in the full-width title is 2 bytes)
    return newTitle;
}

export const EncodingName: { [k: number]: string } = {
    [Encoding.sp]: 'SP',
    [Encoding.lp2]: 'LP2',
    [Encoding.lp4]: 'LP4',
};

export type DisplayTrack = {
    index: number;
    title: string;
    fullWidthTitle: string;
    group: string | null;
    duration: string;
    encoding: string;
};

export function getSortedTracks(disc: Disc | null) {
    let tracks: DisplayTrack[] = [];
    if (disc !== null) {
        for (let group of disc.groups) {
            for (let track of group.tracks) {
                tracks.push({
                    index: track.index,
                    title: track.title ?? `Unknown Title`,
                    fullWidthTitle: track.fullWidthTitle ?? ``,
                    group: group.title ?? null,
                    encoding: EncodingName[track.encoding],
                    duration: formatTimeFromFrames(track.duration, false),
                });
            }
        }
    }
    tracks.sort((l, r) => l.index - r.index);
    return tracks;
}

export function getGroupedTracks(disc: Disc | null) {
    if (!disc) {
        return [];
    }
    let groupedList: Group[] = [];
    let ungroupedTracks = [...(disc.groups.find(n => n.title === null)?.tracks ?? [])];

    let lastIndex = 0;

    for (let group of disc.groups) {
        if (group.title === null) {
            continue; // Ungrouped tracks
        }
        let toCopy = group.tracks[0].index - lastIndex;
        groupedList.push({
            index: -1,
            title: null,
            fullWidthTitle: null,
            tracks: toCopy === 0 ? [] : ungroupedTracks.splice(0, toCopy),
        });
        lastIndex = group.tracks[group.tracks.length - 1].index + 1;
        groupedList.push(group);
    }
    groupedList.push({
        index: -1,
        title: null,
        fullWidthTitle: null,
        tracks: ungroupedTracks,
    });
    return groupedList;
}

export function recomputeGroupsAfterTrackMove(disc: Disc, trackIndex: number, targetIndex: number) {
    // Used for moving tracks in netmd-mock and deleting
    let offset = trackIndex > targetIndex ? 1 : -1;
    let deleteMode = targetIndex === -1;

    if (deleteMode) {
        offset = -1;
        targetIndex = disc.trackCount;
    }

    let boundsStart = Math.min(trackIndex, targetIndex);
    let boundsEnd = Math.max(trackIndex, targetIndex);

    let allTracks = disc.groups
        .map(n => n.tracks)
        .reduce((a, b) => a.concat(b), [])
        .sort((a, b) => a.index - b.index)
        .filter(n => !deleteMode || n.index !== trackIndex);

    let groupBoundaries: {
        name: string | null;
        fullWidthName: string | null;
        start: number;
        end: number;
    }[] = disc.groups
        .filter(n => n.title !== null)
        .map(group => ({
            name: group.title,
            fullWidthName: group.fullWidthTitle,
            start: group.tracks[0].index,
            end: group.tracks[0].index + group.tracks.length - 1,
        })); // Convert to a format better for shifting

    let anyChanges = false;

    for (let group of groupBoundaries) {
        if (group.start > boundsStart && group.start <= boundsEnd) {
            group.start += offset;
            anyChanges = true;
        }
        if (group.end >= boundsStart && group.end < boundsEnd) {
            group.end += offset;
            anyChanges = true;
        }
    }

    if (!anyChanges) return disc;

    let newDisc: Disc = { ...disc };

    // Convert back
    newDisc.groups = groupBoundaries
        .map(n => ({
            title: n.name,
            fullWidthTitle: n.fullWidthName,
            index: n.start,
            tracks: allTracks.slice(n.start, n.end + 1),
        }))
        .filter(n => n.tracks.length > 0);

    // Convert ungrouped tracks
    let allGrouped = newDisc.groups.map(n => n.tracks).reduce((a, b) => a.concat(b), []);
    let ungrouped = allTracks.filter(n => !allGrouped.includes(n));

    // Fix all the track indexes
    if (deleteMode) {
        for (let i = 0; i < allTracks.length; i++) {
            allTracks[i].index = i;
        }
    }

    if (ungrouped.length) newDisc.groups.unshift({ title: null, fullWidthTitle: null, index: 0, tracks: ungrouped });

    return newDisc;
}

export function compileDiscTitles(disc: Disc) {
    let availableCharactersForTitle = getAvailableCharsForTitle(
        {
            ...disc,
            title: '',
            fullWidthTitle: '',
        },
        false
    );
    // If the disc or any of the groups, or any track has a full-width title, provide support for them
    const useFullWidth =
        disc.fullWidthTitle ||
        disc.groups.filter(n => !!n.fullWidthTitle).length > 0 ||
        disc.groups
            .map(n => n.tracks)
            .reduce((a, b) => a.concat(b), [])
            .filter(n => !!n.fullWidthTitle).length > 0;

    const fixLength = (l: number) => Math.ceil(l / 7) * 7;

    let newRawTitle = '',
        newRawFullWidthTitle = '';
    if (disc.title) newRawTitle = `0;${disc.title}//`;
    if (useFullWidth) newRawFullWidthTitle = `０；${disc.fullWidthTitle}／／`;
    for (let n of disc.groups) {
        if (n.title === null || n.tracks.length === 0) continue;
        let range = `${n.tracks[0].index + 1}`;
        if (n.tracks.length !== 1) {
            // Special case
            range += `-${n.tracks[0].index + n.tracks.length}`;
        }

        let newRawTitleAfterGroup = newRawTitle + `${range};${n.title}//`,
            newRawFullWidthTitleAfterGroup = newRawFullWidthTitle + halfWidthToFullWidthRange(range) + `；${n.fullWidthTitle ?? ''}／／`;

        let titlesLengthInTOC = fixLength(getHalfWidthTitleLength(newRawTitleAfterGroup));

        if (useFullWidth) titlesLengthInTOC += fixLength(newRawFullWidthTitleAfterGroup.length * 2);

        if (availableCharactersForTitle - titlesLengthInTOC < 0) break;

        newRawTitle = newRawTitleAfterGroup;
        newRawFullWidthTitle = newRawFullWidthTitleAfterGroup;
    }

    let titlesLengthInTOC = fixLength(getHalfWidthTitleLength(newRawTitle));
    if (useFullWidth) titlesLengthInTOC += fixLength(newRawFullWidthTitle.length * 2); // If this check fails the titles without the groups already take too much space, don't change anything
    if (availableCharactersForTitle - titlesLengthInTOC < 0) {
        return null;
    }

    return {
        newRawTitle,
        newRawFullWidthTitle: useFullWidth ? newRawFullWidthTitle : '',
    };
}

export function isSequential(numbers: number[]) {
    if (numbers.length === 0) return true;
    let last = numbers[0];
    for (let num of numbers) {
        if (num === last) {
            ++last;
        } else return false;
    }
    return true;
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
