import { Track, Channels, Encoding, Wireformat, TrackFlag, DeviceStatus, Group } from 'netmd-js';
import { NetMDService } from './netmd';
import { sleep, sanitizeFullWidthTitle, sanitizeHalfWidthTitle, asyncMutex, recomputeGroupsAfterTrackMove, isSequential } from '../utils';
import { assert } from 'netmd-js/dist/utils';
import { Mutex } from 'async-mutex';

class NetMDMockService implements NetMDService {
    public statusMonitorTimer: any;
    public mutex = new Mutex();
    public _tracksTitlesMaxLength = 1700;
    public _discTitle: string = 'Mock Disc';
    public _fullWidthDiscTitle: string = '';
    public _discCapacity: number = 80 * 60 * 512;
    public _tracks: Track[] = [
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 0,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Long name for - Mock Track 1 - by some artist -12398729837198723',
            fullWidthTitle: '',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 1,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 2',
            fullWidthTitle: '',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 2,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 3',
            fullWidthTitle: '',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 3,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 4',
            fullWidthTitle: '',
        },
        {
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: 4,
            channel: Channels.stereo,
            protected: TrackFlag.unprotected,
            title: 'Mock Track 5',
            fullWidthTitle: '',
        },
    ];
    public _groups: Group[] = [
        {
            title: null,
            index: 0,
            tracks: this._tracks.slice(2),
            fullWidthTitle: '',
        },
        {
            title: 'Test',
            fullWidthTitle: '',
            index: 0,
            tracks: [this._tracks[0], this._tracks[1]],
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

    _getDisc() {
        return {
            title: this._discTitle,
            fullWidthTitle: this._fullWidthDiscTitle,
            writeProtected: false,
            writable: true,
            left: this._discCapacity - this._getUsed(),
            used: this._getUsed(),
            total: this._discCapacity,
            trackCount: this._tracks.length,
            groups: this._groups,
        };
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
        return JSON.parse(JSON.stringify(this._getDisc()));
    }

    async renameGroup(groupBegin: number, newName: string, newFullWidth?: string) {
        let group = this._groups.slice(1).find(n => n.index === groupBegin);
        if (!group) return;
        group.title = newName;
        if (newFullWidth !== undefined) group.fullWidthTitle = newFullWidth;
    }

    async addGroup(groupBegin: number, groupLength: number, newName: string) {
        let ungrouped = this._groups.find(n => n.title === null);
        if(!ungrouped) return; // You can only group tracks that aren't already in a different group, if there's no such tracks, there's no point to continue
        let ungroupedLengthBeforeGroup = ungrouped.tracks.length;

        let thisGroupTracks = ungrouped.tracks.filter(n => n.index >= groupBegin && n.index < groupBegin + groupLength);
        ungrouped.tracks = ungrouped.tracks.filter(n => !thisGroupTracks.includes(n));

        if(ungroupedLengthBeforeGroup - ungrouped.tracks.length !== groupLength){
            throw new Error('A track cannot be in 2 groups!');
        }

        if (!isSequential(thisGroupTracks.map(n => n.index))) {
            throw new Error('Invalid sequence of tracks!');
        }
        this._groups.push({
            title: newName,
            fullWidthTitle: '',
            index: groupBegin,
            tracks: thisGroupTracks,
        });
    }

    async deleteGroup(groupBegin: number) {
        const thisGroup = this._groups.slice(1).find(n => n.tracks[0].index === groupBegin);
        if (!thisGroup) return;
        let ungroupedGroup = this._groups.find(n => n.title === null);
        if(!ungroupedGroup){
            ungroupedGroup = {
                title: null,
                fullWidthTitle: null,
                tracks: [],
                index: 0
            };
            this._groups.unshift(ungroupedGroup);
        }
        ungroupedGroup.tracks = ungroupedGroup.tracks.concat(thisGroup.tracks).sort((a, b) => a.index - b.index);
        this._groups.splice(this._groups.indexOf(thisGroup), 1);
    }

    async rewriteGroups(groups: Group[]) {
        this._groups = [...groups];
    }

    async getDeviceStatus() {
        return JSON.parse(JSON.stringify(this._status));
    }

    async getDeviceName() {
        return `Generic MD Unit`;
    }

    async finalize() {}

    async renameTrack(index: number, newTitle: string, fullWidthTitle?: string) {
        newTitle = sanitizeHalfWidthTitle(newTitle);
        if (this._getTracksTitlesLength() + newTitle.length > this._tracksTitlesMaxLength) {
            throw new Error(`Track's title too long`);
        }
        if (fullWidthTitle !== undefined) {
            this._tracks[index].fullWidthTitle = sanitizeFullWidthTitle(fullWidthTitle);
        }
        this._tracks[index].title = newTitle;
    }

    async renameDisc(newName: string, fullWidthName?: string) {
        this._discTitle = sanitizeHalfWidthTitle(newName);
        if (fullWidthName !== undefined) this._fullWidthDiscTitle = sanitizeFullWidthTitle(fullWidthName);
    }

    async deleteTracks(indexes: number[]) {
        debugger;
        indexes = indexes.sort();
        indexes.reverse();
        for(let index of indexes){
            this._groups = recomputeGroupsAfterTrackMove(this._getDisc(), index, -1).groups;
            this._tracks.splice(index, 1);
            this._groups.forEach(n => n.tracks = n.tracks.filter(n => this._tracks.includes(n)));
        }
        this._updateTrackIndexes();
    }

    async moveTrack(src: number, dst: number, updateGroups?: boolean) {
        let t = this._tracks.splice(src, 1);
        assert(t.length === 1);
        this._tracks.splice(dst, 0, t[0]);
        this._updateTrackIndexes();
        if (updateGroups || updateGroups === undefined) this._groups = recomputeGroupsAfterTrackMove(this._getDisc(), src, dst).groups;
    }

    async wipeDisc() {
        this._tracks = [];
    }

    async wipeDiscTitleInfo() {
        this._groups = [{
            index: 0,
            title: null,
            fullWidthTitle: null,
            tracks: this._tracks
        }];
        this._discTitle = "";
        this._fullWidthDiscTitle = "";
    }

    async upload(
        title: string,
        fullWidthTitle: string,
        data: ArrayBuffer,
        format: Wireformat,
        progressCallback: (progress: { written: number; encrypted: number; total: number }) => void
    ) {
        progressCallback({ written: 0, encrypted: 0, total: 100 });

        let halfWidthTitle = sanitizeHalfWidthTitle(title);
        fullWidthTitle = sanitizeFullWidthTitle(fullWidthTitle);

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
            title: halfWidthTitle,
            duration: 5 * 60 * 512,
            encoding: Encoding.sp,
            index: this._tracks.length,
            protected: TrackFlag.unprotected,
            channel: 0,
            fullWidthTitle: fullWidthTitle,
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
