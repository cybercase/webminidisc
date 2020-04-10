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

import App from './components/app';

import './index.css';
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

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);

// serviceWorker.unregister();
serviceWorker.register();
