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
import { getAvailableCharsForTrackTitle, framesToSec, sleepWithProgressCallback, sleep, askNotificationPermission } from '../utils';
import * as mm from 'music-metadata-browser';
import { TitleFormatType, UploadFormat } from './convert-dialog-feature';
import NotificationCompleteIconUrl from '../images/record-complete-notification-icon.png';

export function control(action: 'play' | 'stop' | 'next' | 'prev' | 'goto', params?: unknown) {
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
            case 'goto':
                if (params && typeof params === 'number' && params >= 0) {
                    await serviceRegistry.netmdService!.gotoTrack(params);
                }
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
        let disc = await serviceRegistry.netmdService!.listContent();
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

export function renameTrack({ index, newName }: { index: number; newName: string }) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        dispatch(renameDialogActions.setVisible(false));
        try {
            await netmdService!.renameTrack(index, newName);
        } catch (err) {
            console.error(err);
            dispatch(batchActions([errorDialogAction.setVisible(true), errorDialogAction.setErrorMessage(`Rename failed.`)]));
        }
        listContent()(dispatch);
    };
}

export function renameDisc({ newName }: { newName: string }) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        await netmdService!.renameDisc(newName);
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
        indexes = indexes.sort();
        indexes.reverse();
        for (let index of indexes) {
            await netmdService!.deleteTrack(index);
        }
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
        let maxTitleLength = disc ? getAvailableCharsForTrackTitle(getTracks(disc).map(track => track.title || ``)) : -1;
        maxTitleLength = Math.floor(maxTitleLength / files.length);

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

            if (maxTitleLength > -1) {
                title = title.substring(0, maxTitleLength);
            }

            trackUpdate.current = i++;
            trackUpdate.titleCurrent = title;
            updateTrack();
            updateProgressCallback({ written: 0, encrypted: 0, total: 100 });
            try {
                await netmdService?.upload(title, data, wireformat, updateProgressCallback);
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
