import {
    openNewDevice,
    NetMDInterface,
    Disc,
    listContent,
    openPairedDevice,
    Wireformat,
    MDTrack,
    download,
    getDeviceStatus,
    DeviceStatus,
    Group,
} from 'netmd-js';
import { makeGetAsyncPacketIteratorOnWorkerThread } from 'netmd-js/dist/web-encrypt-worker';
import { Logger } from 'netmd-js/dist/logger';
import {
    asyncMutex,
    sanitizeHalfWidthTitle,
    sanitizeFullWidthTitle,
    sleep,
    isSequential,
    compileDiscTitles,
    recomputeGroupsAfterTrackMove,
} from '../utils';
import { Mutex } from 'async-mutex';

const Worker = require('worker-loader!netmd-js/dist/web-encrypt-worker.js'); // eslint-disable-line import/no-webpack-loader-syntax

export interface NetMDService {
    mutex: Mutex;
    getDeviceStatus(): Promise<DeviceStatus>;
    pair(): Promise<boolean>;
    connect(): Promise<boolean>;
    listContent(): Promise<Disc>;
    getDeviceName(): Promise<string>;
    finalize(): Promise<void>;
    renameTrack(index: number, newTitle: string, newFullWidthTitle?: string): Promise<void>;
    renameDisc(newName: string, newFullWidthName?: string): Promise<void>;
    renameGroup(groupBegin: number, newTitle: string, newFullWidthTitle?: string): Promise<void>;
    addGroup(groupBegin: number, groupLength: number, name: string): Promise<void>;
    deleteGroup(groupIndex: number): Promise<void>;
    rewriteGroups(groups: Group[]): Promise<void>;
    deleteTracks(indexes: number[]): Promise<void>;
    moveTrack(src: number, dst: number, updateGroups?: boolean): Promise<void>;
    wipeDisc(): Promise<void>;
    wipeDiscTitleInfo(): Promise<void>;
    upload(
        title: string,
        fullWidthTitle: string,
        data: ArrayBuffer,
        format: Wireformat,
        progressCallback: (progress: { written: number; encrypted: number; total: number }) => void
    ): Promise<void>;

    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    gotoTrack(index: number): Promise<void>;
    getPosition(): Promise<number[] | null>;
}

export class NetMDUSBService implements NetMDService {
    private netmdInterface?: NetMDInterface;
    private logger?: Logger;
    private cachedContentList?: Disc;
    public mutex = new Mutex();
    public statusMonitorTimer: any;

    constructor({ debug = false }: { debug: boolean }) {
        if (debug) {
            // Logging a few methods that have been causing issues with some units
            const _fn = (...args: any) => {
                if (args && args[0] && args[0].method) {
                    console.log(...args);
                }
            };
            this.logger = {
                debug: _fn,
                info: _fn,
                warn: _fn,
                error: _fn,
                child: () => this.logger!,
            };
        }
    }

    async _rewriteRawTitles(titleObject: { newRawTitle: string; newRawFullWidthTitle: string } | null) {
        if (titleObject === null) return;
        await this.netmdInterface!.cacheTOC();
        await this.netmdInterface!.setDiscTitle(sanitizeHalfWidthTitle(titleObject.newRawTitle));
        await this.netmdInterface!.setDiscTitle(sanitizeFullWidthTitle(titleObject.newRawFullWidthTitle), true);
        await this.netmdInterface!.syncTOC();
        this._dropCache();
    }

    async _listContent() {
        // listContent takes a long time to execute (>3000ms), so I think caching it should speed up the app
        if (!this.cachedContentList) {
            console.log("There's no cached version of the TOC, caching");
            this.cachedContentList = await listContent(this.netmdInterface!);
        } else {
            console.log("There's a cached TOC available.");
        }
        return JSON.parse(JSON.stringify(this.cachedContentList)) as Disc;
    }

    _dropCache() {
        console.log('Cached TOC Dropped');
        this.cachedContentList = undefined;
    }

    async pair() {
        this._dropCache();
        let iface = await openNewDevice(navigator.usb, this.logger);
        if (iface === null) {
            return false;
        }
        this.netmdInterface = iface;
        return true;
    }

    async connect() {
        this._dropCache();
        let iface = await openPairedDevice(navigator.usb, this.logger);
        if (iface === null) {
            return false;
        }
        this.netmdInterface = iface;
        return true;
    }

    @asyncMutex
    async listContent() {
        this._dropCache();
        return await this._listContent();
    }

    @asyncMutex
    async getDeviceStatus() {
        return await getDeviceStatus(this.netmdInterface!);
    }

    @asyncMutex
    async getDeviceName() {
        return await this.netmdInterface!.netMd.getDeviceName();
    }

    @asyncMutex
    async finalize() {
        await this.netmdInterface!.netMd.finalize();
        this._dropCache();
    }

    @asyncMutex
    async rewriteGroups(groups: Group[]) {
        const disc = await this._listContent();
        disc.groups = groups;
        await this._rewriteRawTitles(compileDiscTitles(disc));
    }

    @asyncMutex
    async renameTrack(index: number, title: string, fullWidthTitle?: string) {
        title = sanitizeHalfWidthTitle(title);
        await this.netmdInterface!.cacheTOC();
        await this.netmdInterface!.setTrackTitle(index, title);
        if (fullWidthTitle !== undefined) {
            await this.netmdInterface!.setTrackTitle(index, sanitizeFullWidthTitle(fullWidthTitle), true);
        }
        await this.netmdInterface!.syncTOC();
        this._dropCache();
    }

    @asyncMutex
    async renameGroup(groupBegin: number, newName: string, newFullWidthName?: string) {
        const disc = await this._listContent();
        let thisGroup = disc.groups.find(n => n.tracks[0].index === groupBegin);
        if (!thisGroup) return;

        thisGroup.title = newName;
        if (newFullWidthName !== undefined) thisGroup.fullWidthTitle = newFullWidthName;
        await this._rewriteRawTitles(compileDiscTitles(disc));
    }

    @asyncMutex
    async addGroup(groupBegin: number, groupLength: number, title: string) {
        const disc = await this._listContent();
        let ungrouped = disc.groups.find(n => n.title === null);
        if (!ungrouped) return; // You can only group tracks that aren't already in a different group, if there's no such tracks, there's no point to continue
        let ungroupedLengthBeforeGroup = ungrouped.tracks.length;

        let thisGroupTracks = ungrouped.tracks.filter(n => n.index >= groupBegin && n.index < groupBegin + groupLength);
        ungrouped.tracks = ungrouped.tracks.filter(n => !thisGroupTracks.includes(n));

        if (ungroupedLengthBeforeGroup - ungrouped.tracks.length !== groupLength) {
            throw new Error('A track cannot be in 2 groups!');
        }

        if (!isSequential(thisGroupTracks.map(n => n.index))) {
            throw new Error('Invalid sequence of tracks!');
        }
        disc.groups.push({
            title,
            fullWidthTitle: '',
            index: groupBegin,
            tracks: thisGroupTracks,
        });
        await this._rewriteRawTitles(compileDiscTitles(disc));
    }

    @asyncMutex
    async deleteGroup(groupBegin: number) {
        const disc = await this._listContent();

        let thisGroup = disc.groups.find(n => n.tracks[0].index === groupBegin);
        if (thisGroup) disc.groups.splice(disc.groups.indexOf(thisGroup), 1);

        await this._rewriteRawTitles(compileDiscTitles(disc));
    }

    @asyncMutex
    async renameDisc(newName: string, newFullWidthName?: string) {
        // TODO: This whole function should be moved in netmd-js
        const oldName = await this.netmdInterface!.getDiscTitle();
        const oldFullWidthName = await this.netmdInterface!.getDiscTitle(true);
        const oldRawName = await this.netmdInterface!._getDiscTitle();
        const oldRawFullWidthName = await this.netmdInterface!._getDiscTitle(true);
        const hasGroups = oldRawName.indexOf('//') >= 0;
        const hasFullWidthGroups = oldRawName.indexOf('／／') >= 0;
        const hasGroupsAndTitle = oldRawName.startsWith('0;');
        const hasFullWidthGroupsAndTitle = oldRawName.startsWith('０；');

        newName = sanitizeHalfWidthTitle(newName);
        newFullWidthName = newFullWidthName && sanitizeFullWidthTitle(newFullWidthName);

        if (newFullWidthName !== oldFullWidthName && newFullWidthName !== undefined) {
            let newFullWidthNameWithGroups;
            if (hasFullWidthGroups) {
                if (hasFullWidthGroupsAndTitle) {
                    newFullWidthNameWithGroups = oldRawFullWidthName.replace(
                        /^０；.*?／／/,
                        newFullWidthName !== '' ? `０；${newFullWidthName}／／` : ``
                    );
                } else {
                    newFullWidthNameWithGroups = `０；${newFullWidthName}／／${oldRawFullWidthName}`; // Add the new title
                }
            } else {
                newFullWidthNameWithGroups = newFullWidthName;
            }
            await this.netmdInterface!.cacheTOC();
            await this.netmdInterface!.setDiscTitle(newFullWidthNameWithGroups, true);
            await this.netmdInterface!.syncTOC();
            this._dropCache();
        }

        if (newName === oldName) {
            return;
        }

        let newNameWithGroups;

        if (hasGroups) {
            if (hasGroupsAndTitle) {
                newNameWithGroups = oldRawName.replace(/^0;.*?\/\//, newName !== '' ? `0;${newName}//` : ``); // Replace or delete the old title
            } else {
                newNameWithGroups = `0;${newName}//${oldRawName}`; // Add the new title
            }
        } else {
            newNameWithGroups = newName;
        }

        await this.netmdInterface!.cacheTOC();
        await this.netmdInterface!.setDiscTitle(newNameWithGroups);
        await this.netmdInterface!.syncTOC();
        this._dropCache();
    }

    @asyncMutex
    async deleteTracks(indexes: number[]) {
        indexes = indexes.sort();
        indexes.reverse();
        let content = await this._listContent();
        for (let index of indexes) {
            content = recomputeGroupsAfterTrackMove(content, index, -1);
            await this.netmdInterface!.eraseTrack(index);
            await sleep(100);
        }
        await this._rewriteRawTitles(compileDiscTitles(content));
        this._dropCache();
    }

    @asyncMutex
    async wipeDisc() {
        await this.netmdInterface!.eraseDisc();
        this._dropCache();
    }

    @asyncMutex
    async wipeDiscTitleInfo() {
        await this._rewriteRawTitles({
            newRawTitle: '',
            newRawFullWidthTitle: '',
        });
    }

    @asyncMutex
    async moveTrack(src: number, dst: number, updateGroups?: boolean) {
        await this.netmdInterface!.moveTrack(src, dst);

        if (updateGroups === undefined || updateGroups) {
            await this._rewriteRawTitles(compileDiscTitles(recomputeGroupsAfterTrackMove(await this._listContent(), src, dst)));
        }
        this._dropCache();
    }

    async upload(
        title: string,
        fullWidthTitle: string,
        data: ArrayBuffer,
        format: Wireformat,
        progressCallback: (progress: { written: number; encrypted: number; total: number }) => void
    ) {
        let total = data.byteLength;
        let written = 0;
        let encrypted = 0;
        function updateProgress() {
            progressCallback({ written, encrypted, total });
        }

        let w = new Worker();

        let webWorkerAsyncPacketIterator = makeGetAsyncPacketIteratorOnWorkerThread(w, ({ encryptedBytes }) => {
            encrypted = encryptedBytes;
            updateProgress();
        });

        let halfWidthTitle = sanitizeHalfWidthTitle(title);
        fullWidthTitle = sanitizeFullWidthTitle(fullWidthTitle);
        let mdTrack = new MDTrack(halfWidthTitle, format, data, 0x80000, fullWidthTitle, webWorkerAsyncPacketIterator);

        await download(this.netmdInterface!, mdTrack, ({ writtenBytes }) => {
            written = writtenBytes;
            updateProgress();
        });

        w.terminate();
        this._dropCache();
    }

    @asyncMutex
    async play() {
        await this.netmdInterface!.play();
    }
    @asyncMutex
    async pause() {
        await this.netmdInterface!.pause();
    }
    @asyncMutex
    async stop() {
        await this.netmdInterface!.stop();
    }
    @asyncMutex
    async next() {
        await this.netmdInterface!.nextTrack();
    }
    @asyncMutex
    async prev() {
        await this.netmdInterface!.previousTrack();
    }

    @asyncMutex
    async gotoTrack(index: number) {
        await this.netmdInterface!.gotoTrack(index);
    }

    @asyncMutex
    async getPosition() {
        return await this.netmdInterface!.getPosition();
    }
}
