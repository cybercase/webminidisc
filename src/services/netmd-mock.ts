import { Disc, Track, Encoding, Wireformat, TrackFlag } from 'netmd-js';
import { NetMDService } from './netmd';
import { sleep } from '../utils';
import { assert } from 'netmd-js/dist/utils';

class NetMDMockService implements NetMDService {
    public _discTitle: string = 'Mock Discs';
    public _tracks: Track[] = [
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 0,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 1',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 1,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 2',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 2,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 3',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 3,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 4',
        },
    ];

    _updateTrackIndexes() {
        for (let i = 0; i < this._tracks.length; i++) {
            this._tracks[i].index = i;
        }
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
                left: 60 * 60 * 512,
                used: 20 * 60 * 512,
                total: 80 * 60 * 512,
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
        return `Mock MD Unit`;
    }

    async finalize() {}

    async renameTrack(index: number, newTitle: string) {
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
}

export { NetMDMockService };
