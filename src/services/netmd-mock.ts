import { Disc, Track, Encoding, Wireformat, TrackFlag } from 'netmd-js';
import { NetMDService } from './netmd';
import { sleep, sanitizeTitle } from '../utils';
import { assert } from 'netmd-js/dist/utils';

class NetMDMockService implements NetMDService {
    public _currentTrack: number = 0;
    public _tracksTitlesMaxLength = 1700;
    public _discTitle: string = 'Mock Disc';
    public _discCapacity: number = 80 * 60 * 512;
    public _tracks: Track[] = [
        // {
        //     duration: 5 * 60 * 512,
        //     encoding: Encoding.sp,
        //     index: 0,
        //     protected: TrackFlag.unprotected,
        //     title: 'Mock Track 1',
        // },
        // {
        //     duration: 5 * 60 * 512,
        //     encoding: Encoding.sp,
        //     index: 1,
        //     protected: TrackFlag.unprotected,
        //     title: 'Mock Track 2',
        // },
        // {
        //     duration: 5 * 60 * 512,
        //     encoding: Encoding.sp,
        //     index: 2,
        //     protected: TrackFlag.unprotected,
        //     title: 'Mock Track 3',
        // },
        // {
        //     duration: 5 * 60 * 512,
        //     encoding: Encoding.sp,
        //     index: 3,
        //     protected: TrackFlag.unprotected,
        //     title: 'Mock Track 4',
        // },
    ];

    _updateTrackIndexes() {
        for (let i = 0; i < this._tracks.length; i++) {
            this._tracks[i].index = i;
        }
    }

    _getUsed() {
        let used = 0;
        for (let t of this._tracks) {
            used += t.duration;
        }
        return used;
    }

    _getTracksTitlesLength() {
        return this._tracks.reduce((acc, track) => acc + (track.title?.length ?? 0), 0);
    }

    async pair() {
        return true;
    }

    async connect() {
        return true;
    }

    async listContent() {
        // This object ends up in the state of redux and Immer will freeze it.
        // That's why it's deep cloned
        return JSON.parse(
            JSON.stringify({
                title: this._discTitle,
                writeProtected: false,
                writable: true,
                left: this._discCapacity - this._getUsed(),
                used: this._getUsed(),
                total: this._discCapacity,
                trackCount: this._tracks.length,
                groups: [
                    {
                        index: 0,
                        title: null,
                        tracks: this._tracks,
                    },
                ],
            })
        );
    }

    async getDeviceName() {
        return `Generic MD Unit`;
    }

    async finalize() {}

    async renameTrack(index: number, newTitle: string) {
        newTitle = sanitizeTitle(newTitle);
        if (this._getTracksTitlesLength() + newTitle.length > this._tracksTitlesMaxLength) {
            throw new Error(`Track's title too long`);
        }
        this._tracks[index].title = newTitle;
    }

    async renameDisc(newName: string) {
        this._discTitle = newName;
    }

    async deleteTrack(index: number) {
        this._tracks.splice(index, 1);
        this._updateTrackIndexes();
    }

    async moveTrack(src: number, dst: number) {
        let t = this._tracks.splice(src, 1);
        assert(t.length === 1);
        this._tracks.splice(dst, 0, t[0]);
        this._updateTrackIndexes();
    }

    async wipeDisc() {
        this._tracks = [];
    }

    async upload(
        title: string,
        data: ArrayBuffer,
        format: Wireformat,
        progressCallback: (progress: { written: number; encrypted: number; total: number }) => void
    ) {
        progressCallback({ written: 0, encrypted: 0, total: 100 });

        title = sanitizeTitle(title);

        if (this._getTracksTitlesLength() + title.length > this._tracksTitlesMaxLength) {
            throw new Error(`Track's title too long`); // Simulates reject from device
        }

        await sleep(0.5);
        this._tracks.push({
            title,
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: this._tracks.length,
            protected: TrackFlag.unprotected,
        });
        await sleep(0.5);
        progressCallback({ written: 100, encrypted: 100, total: 100 });
    }

    async play() {
        console.log('play');
    }
    async pause() {
        console.log('pause');
    }
    async stop() {
        console.log('stop');
    }
    async next() {
        console.log('next');
    }
    async prev() {
        console.log('prev');
    }
    async gotoTrack(index: number) {
        this._currentTrack = index;
        await sleep(500);
    }

    async getPosition() {
        return [this._currentTrack, 0, 0, 1];
    }
}

export { NetMDMockService };
