import { batchActions } from 'redux-batched-actions';
import { AppDispatch, RootState } from './store';
import { actions as uploadDialogActions } from './upload-dialog-feature';
import { actions as renameDialogActions } from './rename-dialog-feature';
import { actions as errorDialogAction } from './error-dialog-feature';
import { actions as recordDialogAction } from './record-dialog-feature';
import { actions as appStateActions } from './app-feature';
import { actions as mainActions } from './main-feature';
import serviceRegistry from '../services/registry';
import { Wireformat, getTracks } from 'netmd-js';
import { AnyAction } from '@reduxjs/toolkit';
import {
    getAvailableCharsForTitle,
    framesToSec,
    sleepWithProgressCallback,
    sleep,
    askNotificationPermission,
    getGroupedTracks,
    getHalfWidthTitleLength,
} from '../utils';
import * as mm from 'music-metadata-browser';
import { TitleFormatType, UploadFormat } from './convert-dialog-feature';
import NotificationCompleteIconUrl from '../images/record-complete-notification-icon.png';
import { assertNumber } from 'netmd-js/dist/utils';

export function control(action: 'play' | 'stop' | 'next' | 'prev' | 'goto' | 'pause', params?: unknown) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        switch (action) {
            case 'play':
                await serviceRegistry.netmdService!.play();
                break;
            case 'stop':
                await serviceRegistry.netmdService!.stop();
                break;
            case 'next':
                await serviceRegistry.netmdService!.next();
                break;
            case 'prev':
                await serviceRegistry.netmdService!.prev();
                break;
            case 'pause':
                await serviceRegistry.netmdService!.pause();
                break;
            case 'goto':
                const trackNumber = assertNumber(params, 'Invalid track number for "goto" command');
                await serviceRegistry.netmdService!.gotoTrack(trackNumber);
                break;
        }
        // CAVEAT: change-track might take a up to a few seconds to complete.
        // We wait 500ms and let the monitor do further updates
        await sleep(500);
        try {
            let deviceStatus = await serviceRegistry.netmdService!.getDeviceStatus();
            dispatch(mainActions.setDeviceStatus(deviceStatus));
        } catch (e) {
            console.log('control: Cannot get device status');
        }
    };
}

export function renameGroup({ groupIndex, newName, newFullWidthName }: { groupIndex: number; newName: string; newFullWidthName?: string }) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        await serviceRegistry!.netmdService?.renameGroup(groupIndex, newName, newFullWidthName);
        listContent()(dispatch);
    };
}

export function groupTracks(indexes: number[]) {
    return async function(dispatch: AppDispatch) {
        let begin = indexes[0];
        let length = indexes[indexes.length - 1] - begin + 1;
        const { netmdService } = serviceRegistry;

        netmdService!.addGroup(begin, length, '');
        listContent()(dispatch);
    };
}

export function deleteGroup(groupBegin: number) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        netmdService!.deleteGroup(groupBegin);
        listContent()(dispatch);
    };
}

export function dragDropTrack(sourceList: number, sourceIndex: number, targetList: number, targetIndex: number) {
    // This code is here, because it would need to be duplicated in both netmd and netmd-mock.
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        if (sourceList === targetList && sourceIndex === targetIndex) return;
        dispatch(appStateActions.setLoading(true));
        const groupedTracks = getGroupedTracks(await serviceRegistry.netmdService!.listContent());
        // Remove the moved item from its current list
        let movedItem = groupedTracks[sourceList].tracks.splice(sourceIndex, 1)[0];
        let newIndex: number;

        // Calculate bounds
        let boundsStartList, boundsEndList, boundsStartIndex, boundsEndIndex, offset;

        if (sourceList < targetList) {
            boundsStartList = sourceList;
            boundsStartIndex = sourceIndex;
            boundsEndList = targetList;
            boundsEndIndex = targetIndex;
            offset = -1;
        } else if (sourceList > targetList) {
            boundsStartList = targetList;
            boundsStartIndex = targetIndex;
            boundsEndList = sourceList;
            boundsEndIndex = sourceIndex;
            offset = 1;
        } else {
            if (sourceIndex < targetIndex) {
                boundsStartList = boundsEndList = sourceList;
                boundsStartIndex = sourceIndex;
                boundsEndIndex = targetIndex;
                offset = -1;
            } else {
                boundsStartList = boundsEndList = targetList;
                boundsStartIndex = targetIndex;
                boundsEndIndex = sourceIndex;
                offset = 1;
            }
        }

        // Shift indices
        for (let i = boundsStartList; i <= boundsEndList; i++) {
            let startingIndex = i === boundsStartList ? boundsStartIndex : 0;
            let endingIndex = i === boundsEndList ? boundsEndIndex : groupedTracks[i].tracks.length;
            for (let j = startingIndex; j < endingIndex; j++) {
                groupedTracks[i].tracks[j].index += offset;
            }
        }

        // Calculate the moved track's destination index
        if (targetList === 0) {
            newIndex = targetIndex;
        } else {
            if (targetIndex === 0) {
                let prevList = groupedTracks[targetList - 1];
                let i = 2;
                while(prevList && prevList.tracks.length === 0){
                    // Skip past all the empty lists
                    prevList = groupedTracks[targetList - (i++)];
                }
                if (prevList) {
                    // If there's a previous list, make this tracks's index previous list's last item's index + 1
                    let lastIndexOfPrevList = prevList.tracks[prevList.tracks.length - 1].index;
                    newIndex = lastIndexOfPrevList + 1;
                } else newIndex = 0; // Else default to index 0
            } else {
                newIndex = groupedTracks[targetList].tracks[0].index + targetIndex;
            }
        }

        if (movedItem.index !== newIndex) {
            await serviceRegistry!.netmdService!.moveTrack(movedItem.index, newIndex, false);
        }

        movedItem.index = newIndex;
        groupedTracks[targetList].tracks.splice(targetIndex, 0, movedItem);
        let ungrouped = [];

        // Recompile the groups and update them on the player
        let normalGroups = [];
        for (let group of groupedTracks) {
            if(group.tracks.length === 0) continue;
            if (group.index === -1) ungrouped.push(...group.tracks);
            else normalGroups.push(group);
        }
        if (ungrouped.length)
            normalGroups.unshift({
                index: 0,
                title: null,
                fullWidthTitle: null,
                tracks: ungrouped,
            });
        await serviceRegistry.netmdService!.rewriteGroups(normalGroups);
        listContent()(dispatch);
    };
}

export function pair() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(appStateActions.setPairingFailed(false));

        await serviceRegistry.audioExportService!.init();

        try {
            let connected = await serviceRegistry.netmdService!.connect();
            if (connected) {
                dispatch(appStateActions.setMainView('MAIN'));
                return;
            }
        } catch (err) {
            console.error(err);
            // In case of error, just log and try to pair
        }

        try {
            let paired = await serviceRegistry.netmdService!.pair();
            if (paired) {
                dispatch(appStateActions.setMainView('MAIN'));
                return;
            }
            dispatch(batchActions([appStateActions.setPairingMessage(`Connection Failed`), appStateActions.setPairingFailed(true)]));
        } catch (err) {
            console.error(err);
            let message = (err as Error).message;
            dispatch(batchActions([appStateActions.setPairingMessage(message), appStateActions.setPairingFailed(true)]));
        }
    };
}

export function listContent() {
    return async function(dispatch: AppDispatch) {
        // Issue loading
        dispatch(appStateActions.setLoading(true));
        let disc;
        try{
            disc = await serviceRegistry.netmdService!.listContent();
        }catch(err){
            if(window.confirm("Warning: This disc's title data seems to be corrupted.\nDo you wish to erase it?")) {
                await serviceRegistry.netmdService!.wipeDiscTitleInfo();
                disc = await serviceRegistry.netmdService!.listContent();
            } else throw err;
        }
        let deviceName = await serviceRegistry.netmdService!.getDeviceName();
        let deviceStatus = null;
        try {
            deviceStatus = await serviceRegistry.netmdService!.getDeviceStatus();
        } catch (e) {
            console.log('listContent: Cannot get device status');
        }
        dispatch(
            batchActions([
                mainActions.setDisc(disc),
                mainActions.setDeviceName(deviceName),
                mainActions.setDeviceStatus(deviceStatus),
                appStateActions.setLoading(false),
            ])
        );
    };
}

export function renameTrack({ index, newName, newFullWidthName }: { index: number; newName: string; newFullWidthName?: string }) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        dispatch(renameDialogActions.setVisible(false));
        try {
            await netmdService!.renameTrack(index, newName, newFullWidthName);
        } catch (err) {
            console.error(err);
            dispatch(batchActions([errorDialogAction.setVisible(true), errorDialogAction.setErrorMessage(`Rename failed.`)]));
        }
        listContent()(dispatch);
    };
}

export function renameDisc({ newName, newFullWidthName }: { newName: string; newFullWidthName?: string }) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        await netmdService!.renameDisc(
            newName.replace(/\/\//g, ' /'), // Make sure the title doesn't interfere with the groups
            newFullWidthName?.replace(/／／/g, '／')
        );
        dispatch(renameDialogActions.setVisible(false));
        listContent()(dispatch);
    };
}

export function deleteTracks(indexes: number[]) {
    return async function(dispatch: AppDispatch) {
        const confirmation = window.confirm(
            `Proceed with Delete Track${indexes.length !== 1 ? 's' : ''}? This operation cannot be undone.`
        );
        if (!confirmation) {
            return;
        }
        const { netmdService } = serviceRegistry;
        dispatch(appStateActions.setLoading(true));
        await netmdService!.deleteTracks(indexes);
        listContent()(dispatch);
    };
}

export function wipeDisc() {
    return async function(dispatch: AppDispatch) {
        const confirmation = window.confirm(`Proceed with Wipe Disc? This operation cannot be undone.`);
        if (!confirmation) {
            return;
        }
        const { netmdService } = serviceRegistry;
        dispatch(appStateActions.setLoading(true));
        await netmdService!.wipeDisc();
        listContent()(dispatch);
    };
}

export function moveTrack(srcIndex: number, destIndex: number) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        await netmdService!.moveTrack(srcIndex, destIndex);
        listContent()(dispatch);
    };
}

export function recordTracks(indexes: number[], deviceId: string) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(
            batchActions([
                recordDialogAction.setVisible(true),
                recordDialogAction.setProgress({ trackTotal: indexes.length, trackDone: 0, trackCurrent: 0, titleCurrent: '' }),
            ])
        );

        let disc = getState().main.disc;
        let tracks = getTracks(disc!).filter(t => indexes.indexOf(t.index) >= 0);

        const { netmdService, mediaRecorderService } = serviceRegistry;
        await serviceRegistry.netmdService!.stop();

        for (let [i, track] of tracks.entries()) {
            dispatch(
                recordDialogAction.setProgress({
                    trackTotal: tracks.length,
                    trackDone: i,
                    trackCurrent: -1,
                    titleCurrent: track.title ?? '',
                })
            );

            // Wait for the track to be ready to play from 0:00
            await netmdService!.gotoTrack(track.index);
            await netmdService!.play();
            console.log('Waiting for track to be ready to play');
            let position = await netmdService!.getPosition();
            let expected = [track.index, 0, 0, 1];
            while (position === null || !expected.every((_, i) => expected[i] === position![i])) {
                await sleep(250);
                position = await netmdService!.getPosition();
            }
            await netmdService!.pause();
            await netmdService?.gotoTrack(track.index);
            console.log('Track is ready to play');

            // Start recording and play track
            await mediaRecorderService?.initStream(deviceId);
            await mediaRecorderService?.startRecording();
            await netmdService!.play();

            // Wait until track is finished
            let durationInSec = framesToSec(track.duration);
            // await sleep(durationInSec * 1000);
            await sleepWithProgressCallback(durationInSec * 1000, (perc: number) => {
                dispatch(
                    recordDialogAction.setProgress({
                        trackTotal: tracks.length,
                        trackDone: i,
                        trackCurrent: perc,
                        titleCurrent: track.title ?? '',
                    })
                );
            });

            // Stop recording and download the wav
            await mediaRecorderService?.stopRecording();
            mediaRecorderService?.downloadRecorded(`${track.title}`);

            await mediaRecorderService?.closeStream();
        }

        await netmdService!.stop();
        dispatch(recordDialogAction.setVisible(false));
    };
}

export function setNotifyWhenFinished(value: boolean) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        if (Notification.permission !== 'granted') {
            const confirmation = window.confirm(`Enable Notification on recording completed?`);
            if (!confirmation) {
                return;
            }
            const result = await askNotificationPermission();
            if (result !== 'granted') {
                dispatch(appStateActions.setNotificationSupport(false));
                dispatch(appStateActions.setNotifyWhenFinished(false));
                return;
            }
        }
        dispatch(appStateActions.setNotifyWhenFinished(value));
    };
}

export const WireformatDict: { [k: string]: Wireformat } = {
    SP: Wireformat.pcm,
    LP2: Wireformat.lp2,
    LP105: Wireformat.l105kbps,
    LP4: Wireformat.lp4,
};

async function getTrackNameFromMediaTags(file: File, titleFormat: TitleFormatType) {
    const fileData = await file.arrayBuffer();
    const blob = new Blob([new Uint8Array(fileData)]);
    let metadata = await mm.parseBlob(blob);
    const title = metadata.common.title ?? 'Unknown Title';
    const artist = metadata.common.artist ?? 'Unknown Artist';
    const album = metadata.common.album ?? 'Unknown Album';
    switch (titleFormat) {
        case 'title': {
            return title;
        }
        case 'artist-title': {
            return `${artist} - ${title}`;
        }
        case 'album-title': {
            return `${album} - ${title}`;
        }
        case 'artist-album-title': {
            return `${artist} - ${album} - ${title}`;
        }
        case 'filename': {
            let title = file.name;
            // Remove file extension
            const extStartIndex = title.lastIndexOf('.');
            if (extStartIndex > 0) {
                title = title.substring(0, extStartIndex);
            }
            return title;
        }
    }
}

export function convertAndUpload(files: File[], format: UploadFormat, titleFormat: TitleFormatType) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        const { audioExportService, netmdService } = serviceRegistry;
        const wireformat = WireformatDict[format];

        await netmdService?.stop();
        dispatch(batchActions([uploadDialogActions.setVisible(true), uploadDialogActions.setCancelUpload(false)]));

        const updateProgressCallback = ({ written, encrypted, total }: { written: number; encrypted: number; total: number }) => {
            dispatch(uploadDialogActions.setWriteProgress({ written, encrypted, total }));
        };

        const hasUploadBeenCancelled = () => {
            return getState().uploadDialog.cancelled;
        };

        function showFinishedNotificationIfNeeded() {
            const { notifyWhenFinished, hasNotificationSupport } = getState().appState;
            if (!hasNotificationSupport || !notifyWhenFinished) {
                return;
            }
            const notification = new Notification('MiniDisc recording completed', {
                icon: NotificationCompleteIconUrl,
            });
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        }

        let trackUpdate: {
            current: number;
            converting: number;
            total: number;
            titleCurrent: string;
            titleConverting: string;
        } = {
            current: 0,
            converting: 0,
            total: files.length,
            titleCurrent: '',
            titleConverting: '',
        };
        const updateTrack = () => {
            dispatch(uploadDialogActions.setTrackProgress(trackUpdate));
        };

        let conversionIterator = async function*(files: File[]) {
            let converted: Promise<{ file: File; data: ArrayBuffer }>[] = [];

            let i = 0;
            function convertNext() {
                if (i === files.length || hasUploadBeenCancelled()) {
                    trackUpdate.converting = i;
                    trackUpdate.titleConverting = ``;
                    updateTrack();
                    return;
                }

                let f = files[i];
                trackUpdate.converting = i;
                trackUpdate.titleConverting = f.name;
                updateTrack();
                i++;

                converted.push(
                    new Promise(async (resolve, reject) => {
                        let data: ArrayBuffer;
                        try {
                            await audioExportService!.prepare(f);
                            data = await audioExportService!.export({ format });
                            convertNext();
                            resolve({ file: f, data: data });
                        } catch (err) {
                            error = err;
                            errorMessage = `${f.name}: Unsupported or unrecognized format`;
                            reject(err);
                        }
                    })
                );
            }
            convertNext();

            let j = 0;
            while (j < converted.length) {
                yield await converted[j];
                delete converted[j];
                j++;
            }
        };

        let disc = getState().main.disc;
        let useFullWidth = getState().appState.fullWidthSupport;
        let availableCharacters = getAvailableCharsForTitle(disc!);

        let error: any;
        let errorMessage = ``;
        let i = 1;
        for await (let item of conversionIterator(files)) {
            if (hasUploadBeenCancelled()) {
                break;
            }

            const { file, data } = item;

            let title = file.name;
            try {
                title = await getTrackNameFromMediaTags(file, titleFormat);
            } catch (err) {
                console.error(err);
            }

            const fixLength = (l: number) => Math.ceil(l / 7) * 7;
            let halfWidthTitle = title.substr(0, Math.min(getHalfWidthTitleLength(title), availableCharacters));
            availableCharacters -= fixLength(getHalfWidthTitleLength(halfWidthTitle));

            let fullWidthTitle = '';
            if (useFullWidth) {
                fullWidthTitle = title.substr(0, Math.min(title.length * 2, availableCharacters, 210 /* limit is 105 */) / 2);
                availableCharacters -= fixLength(fullWidthTitle.length * 2);
            }

            trackUpdate.current = i++;
            trackUpdate.titleCurrent = halfWidthTitle;
            updateTrack();
            updateProgressCallback({ written: 0, encrypted: 0, total: 100 });
            try {
                await netmdService?.upload(halfWidthTitle, fullWidthTitle, data, wireformat, updateProgressCallback);
            } catch (err) {
                error = err;
                errorMessage = `${file.name}: Error uploading to device. There might not be enough space left.`;
                break;
            }
        }

        let actionToDispatch: AnyAction[] = [uploadDialogActions.setVisible(false)];

        if (error) {
            console.error(error);
            actionToDispatch = actionToDispatch.concat([
                errorDialogAction.setVisible(true),
                errorDialogAction.setErrorMessage(errorMessage),
            ]);
        }

        dispatch(batchActions(actionToDispatch));
        showFinishedNotificationIfNeeded();
        listContent()(dispatch);
    };
}
