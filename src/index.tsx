/* eslint no-restricted-globals: 0 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import * as serviceWorker from './serviceWorker';
import { NetMDUSBService } from './services/netmd';
import { NetMDMockService } from './services/netmd-mock';
import serviceRegistry from './services/registry';

import { store } from './redux/store';
import { actions as appActions } from './redux/app-feature';
import { actions as mainActions } from './redux/main-feature';

import App from './components/app';

import './index.css';
import './fonts/fonts.css';

import { FFMpegAudioExportService } from './services/audio-export';
import { MediaRecorderService } from './services/mediarecorder';

serviceRegistry.netmdService = new NetMDUSBService({ debug: true });
// serviceRegistry.netmdService = new NetMDMockService(); // Uncomment to work without a device attached
serviceRegistry.audioExportService = new FFMpegAudioExportService();
serviceRegistry.mediaRecorderService = new MediaRecorderService();

(function setupEventHandlers() {
    window.addEventListener('beforeunload', ev => {
        let isUploading = store.getState().uploadDialog.visible;
        if (!isUploading) {
            return;
        }
        ev.preventDefault();
        ev.returnValue = `Warning! Recording will be interrupted`;
    });

    if (navigator && navigator.usb) {
        navigator.usb.ondisconnect = function() {
            store.dispatch(appActions.setState('WELCOME'));
        };
    } else {
        store.dispatch(appActions.setBrowserSupported(false));
    }

    // eslint-disable-next-line
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        deferredPrompt = e;
    });
})();

(function statusMonitorManager() {
    // Polls the device for its state while playing tracks
    let statusMonitorInterval: ReturnType<typeof setInterval> | null = null;
    let exceptionOccurred: boolean = false;

    function shouldMonitorBeRunning(state: ReturnType<typeof store.getState>): boolean {
        return (
            !exceptionOccurred &&
            // App ready
            state.appState.mainView === 'MAIN' &&
            state.appState.loading === false &&
            // Disc playing
            state.main.deviceStatus?.state === 'playing' &&
            // No operational dialogs running
            state.convertDialog.visible === false &&
            state.uploadDialog.visible === false &&
            state.recordDialog.visible === false &&
            state.panicDialog.visible === false &&
            state.errorDialog.visible === false &&
            state.dumpDialog.visible === false
        );
    }

    store.subscribe(function() {
        const state = store.getState();
        if (shouldMonitorBeRunning(state) === true && statusMonitorInterval === null) {
            // start monitor
            statusMonitorInterval = setInterval(async () => {
                try {
                    const deviceStatus = await serviceRegistry.netmdService!.getDeviceStatus();
                    store.dispatch(mainActions.setDeviceStatus(deviceStatus));
                } catch (e) {
                    console.error(e);
                    exceptionOccurred = true; // Stop monitor on exception
                }
            }, 5000);
        } else if (shouldMonitorBeRunning(state) === false && statusMonitorInterval !== null) {
            // stop monitor
            clearInterval(statusMonitorInterval);
            statusMonitorInterval = null;
        }
    });
})();

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);

// serviceWorker.unregister();
serviceWorker.register();
