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
    renameGroup(groupIndex: number, newTitle: string, newFullWidthTitle?: string): Promise<void>;
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
    gotoTime(index: number, hour: number, minute: number, second: number, frame: number): Promise<void>;
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

    private async writeRawTitles(titleObject: { newRawTitle: string; newRawFullWidthTitle: string } | null) {
        if (titleObject === null) return;
        await this.netmdInterface!.cacheTOC();
        await this.netmdInterface!.setDiscTitle(sanitizeHalfWidthTitle(titleObject.newRawTitle));
        await this.netmdInterface!.setDiscTitle(sanitizeFullWidthTitle(titleObject.newRawFullWidthTitle), true);
        await this.netmdInterface!.syncTOC();
        this.dropCachedContentList();
    }

    private async listContentUsingCache() {
        if (!this.cachedContentList) {
            console.log("There's no cached version of the TOC, caching");
            this.cachedContentList = await listContent(this.netmdInterface!);
        } else {
            console.log("There's a cached TOC available.");
        }
        return JSON.parse(JSON.stringify(this.cachedContentList)) as Disc;
    }

    private dropCachedContentList() {
        console.log('Cached TOC Dropped');
        this.cachedContentList = undefined;
    }

    async pair() {
        this.dropCachedContentList();
        let iface = await openNewDevice(navigator.usb, this.logger);
        if (iface === null) {
            return false;
        }
        this.netmdInterface = iface;
        return true;
    }

    async connect() {
        this.dropCachedContentList();
        let iface = await openPairedDevice(navigator.usb, this.logger);
        if (iface === null) {
            return false;
        }
        this.netmdInterface = iface;
        return true;
    }

    @asyncMutex
    async listContent() {
        this.dropCachedContentList();
        return await this.listContentUsingCache();
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
        this.dropCachedContentList();
    }

    @asyncMutex
    async rewriteGroups(groups: Group[]) {
        const disc = await this.listContentUsingCache();
        disc.groups = groups;
        await this.writeRawTitles(compileDiscTitles(disc));
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
        this.dropCachedContentList();
    }

    @asyncMutex
    async renameGroup(groupIndex: number, newName: string, newFullWidthName?: string) {
        const disc = await this.listContentUsingCache();
        let thisGroup = disc.groups.find(g => g.index === groupIndex);
        if (!thisGroup) {
            return;
        }

        thisGroup.title = newName;
        if (newFullWidthName !== undefined) {
            thisGroup.fullWidthTitle = newFullWidthName;
        }
        await this.writeRawTitles(compileDiscTitles(disc));
    }

    @asyncMutex
    async addGroup(groupBegin: number, groupLength: number, title: string) {
        const disc = await this.listContentUsingCache();
        let ungrouped = disc.groups.find(n => n.title === null);
        if (!ungrouped) {
            return; // You can only group tracks that aren't already in a different group, if there's no such tracks, there's no point to continue
        }

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
            index: disc.groups.length,
            tracks: thisGroupTracks,
        });
        disc.groups = disc.groups.filter(g => g.tracks.length !== 0).sort((a, b) => a.tracks[0].index - b.tracks[0].index);
        await this.writeRawTitles(compileDiscTitles(disc));
    }

    @asyncMutex
    async deleteGroup(index: number) {
        const disc = await this.listContentUsingCache();

        let groupIndex = disc.groups.findIndex(g => g.index === index);
        if (groupIndex >= 0) {
            disc.groups.splice(groupIndex, 1);
        }

        await this.writeRawTitles(compileDiscTitles(disc));
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
            this.dropCachedContentList();
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
        this.dropCachedContentList();
    }

    @asyncMutex
    async deleteTracks(indexes: number[]) {
        indexes = indexes.sort();
        indexes.reverse();
        let content = await this.listContentUsingCache();
        for (let index of indexes) {
            content = recomputeGroupsAfterTrackMove(content, index, -1);
            await this.netmdInterface!.eraseTrack(index);
            await sleep(100);
        }
        await this.writeRawTitles(compileDiscTitles(content));
        this.dropCachedContentList();
    }

    @asyncMutex
    async wipeDisc() {
        await this.netmdInterface!.eraseDisc();
        this.dropCachedContentList();
    }

    @asyncMutex
    async wipeDiscTitleInfo() {
        await this.writeRawTitles({
            newRawTitle: '',
            newRawFullWidthTitle: '',
        });
    }

    @asyncMutex
    async moveTrack(src: number, dst: number, updateGroups?: boolean) {
        await this.netmdInterface!.moveTrack(src, dst);

        if (updateGroups === undefined || updateGroups) {
            await this.writeRawTitles(compileDiscTitles(recomputeGroupsAfterTrackMove(await this.listContentUsingCache(), src, dst)));
        }
        this.dropCachedContentList();
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
        this.dropCachedContentList();
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
    async gotoTime(index: number, h: number, m: number, s: number, f: number) {
        await this.netmdInterface!.gotoTime(index, h, m, s, f);
    }

    @asyncMutex
    async getPosition() {
        return await this.netmdInterface!.getPosition();
    }
}
