import { Track, Channels, Encoding, Wireformat, TrackFlag, DeviceStatus } from 'netmd-js';
import { NetMDService } from './netmd';
import { sleep, sanitizeTitle, asyncMutex } from '../utils';
import { assert } from 'netmd-js/dist/utils';
import { Mutex } from 'async-mutex';

class NetMDMockService implements NetMDService {
    public statusMonitorTimer: any;
    public mutex = new Mutex();
    public _tracksTitlesMaxLength = 1700;
    public _discTitle: string = 'Mock Disc';
    public _discCapacity: number = 80 * 60 * 512;
    public _tracks: Track[] = [
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 0,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Long name for - Mock Track 1 - by some artist -12398729837198723',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 1,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 2',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 2,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 3',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 3,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 4',
        },
    ];
    public _status: DeviceStatus = {
        discPresent: true,
        track: 0,
        time: { minute: 0, second: 0, frame: 4 },
        state: 'ready',
    };

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

    async getDeviceStatus() {
        return JSON.parse(JSON.stringify(this._status));
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

        const totalSteps = 3;
        for (let step = 0; step <= totalSteps; step++) {
            const written = (100 / totalSteps) * step;
            progressCallback({ written, encrypted: 100, total: 100 });
            await sleep(1000);
        }

        this._tracks.push({
            title,
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: this._tracks.length,
            protected: TrackFlag.unprotected,
            channel: 0,
        });

        await sleep(1000);
        progressCallback({ written: 100, encrypted: 100, total: 100 });
    }

    @asyncMutex
    async play() {
        this._status.state = 'playing';
    }

    @asyncMutex
    async pause() {
        console.log('pause');
    }

    @asyncMutex
    async stop() {
        this._status.state = 'ready';
    }

    @asyncMutex
    async next() {
        if (this._status.track === null) {
            return;
        }
        this._status.track = Math.min(this._status.track + 1, this._tracks.length - 1) % this._tracks.length;
    }

    @asyncMutex
    async prev() {
        if (this._status.track === null) {
            return;
        }
        this._status.track = Math.max(this._status.track - 1, 0) % this._tracks.length;
    }

    async gotoTrack(index: number) {
        this._status.track = index;
        await sleep(500);
    }

    async getPosition() {
        if (this._status.track === null || this._status.time === null) {
            return null;
        }
        return [this._status.track, 0, this._status.time.minute, this._status.time.second, this._status.time.frame];
    }
}

export { NetMDMockService };
