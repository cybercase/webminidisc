/* eslint no-restricted-globals: 0 */
import { getPublicPathFor } from '../utils';
export class AtracdencProcess {
    private messageCallback?: (ev: MessageEvent) => void;

    constructor(public worker: Worker) {
        console.log('[AtracdencProcess] Constructor - Creating worker');
        worker.onmessage = this.handleMessage.bind(this);
        // Add error handling
        worker.onerror = error => {
            console.error('[AtracdencProcess] Worker error:', error);
            // If callback exists, reject with error message
            if (this.messageCallback) {
                this.messageCallback(new MessageEvent('error', { data: { error } }));
                this.messageCallback = undefined;
            }
        };
    }

    async init() {
        console.log('[AtracdencProcess] Initializing worker');
        try {
            const result = await new Promise<MessageEvent>((resolve, reject) => {
                // Initialization timeout (10 seconds)
                const timeoutId = setTimeout(() => {
                    reject(new Error('Worker initialization timeout after 10 seconds'));
                }, 10000);

                this.messageCallback = (ev: MessageEvent) => {
                    clearTimeout(timeoutId);
                    if (ev.type === 'error') {
                        reject(new Error('Worker initialization failed: ' + JSON.stringify(ev.data)));
                    } else {
                        resolve(ev);
                    }
                };

                console.log('[AtracdencProcess] Sending init message to worker');
                this.worker.postMessage({ action: 'init' });
            });

            console.log('[AtracdencProcess] Worker initialized successfully:', result.data);
            return result;
        } catch (error) {
            console.error('[AtracdencProcess] Error initializing worker:', error);
            throw error;
        }
    }

    async encode(data: ArrayBuffer, bitrate: string) {
        console.log(`[AtracdencProcess] Encoding audio with bitrate: ${bitrate}, data size: ${data.byteLength}bytes`);
        try {
            const eventData = await new Promise<MessageEvent>((resolve, reject) => {
                // Encoding timeout (30 seconds)
                const timeoutId = setTimeout(() => {
                    reject(new Error('Encoding operation timeout after 30 seconds'));
                }, 30000);

                this.messageCallback = (ev: MessageEvent) => {
                    clearTimeout(timeoutId);
                    if (ev.type === 'error') {
                        reject(new Error('Encoding failed: ' + JSON.stringify(ev.data)));
                    } else {
                        resolve(ev);
                    }
                };

                console.log('[AtracdencProcess] Sending encode message to worker');
                this.worker.postMessage({ action: 'encode', bitrate, data }, [data]);
            });

            console.log(
                '[AtracdencProcess] Encoding completed successfully, result size:',
                eventData.data.result ? eventData.data.result.byteLength + 'bytes' : 'unknown'
            );
            return eventData.data.result as Uint8Array;
        } catch (error) {
            console.error('[AtracdencProcess] Error encoding audio:', error);
            throw error;
        }
    }

    terminate() {
        console.log('[AtracdencProcess] Terminating worker');
        try {
            this.worker.terminate();
            console.log('[AtracdencProcess] Worker terminated successfully');
        } catch (error) {
            console.error('[AtracdencProcess] Error terminating worker:', error);
        }
    }

    handleMessage(ev: MessageEvent) {
        console.log('[AtracdencProcess] Message received from worker:', ev.data?.action || 'unknown action');
        if (this.messageCallback) {
            this.messageCallback(ev);
            this.messageCallback = undefined;
        } else {
            console.warn('[AtracdencProcess] Received message but no callback is registered');
        }
    }
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    // Worker
    let Module: any;
    onmessage = async (ev: MessageEvent) => {
        try {
            const { action, ...others } = ev.data;
            console.log(`[AtracdencWorker] Received action: ${action}`);

            if (action === 'init') {
                try {
                    console.log('[AtracdencWorker] Importing atracdenc.js script');
                    const scriptPath = getPublicPathFor(`atracdenc.js`);
                    console.log(`[AtracdencWorker] Script path: ${scriptPath}`);
                    self.importScripts(scriptPath);

                    console.log('[AtracdencWorker] Initializing Module');
                    (self as any)
                        .Module()
                        .then((m: any) => {
                            Module = m;
                            console.log('[AtracdencWorker] Module initialized successfully');

                            // Set up logging
                            if (Module.setLogger) {
                                Module.setLogger((msg: string, stream: string) => {
                                    console.log(`[Atracdenc ${stream}] ${msg}`);
                                });
                                console.log('[AtracdencWorker] Logger set up');
                            } else {
                                console.warn('[AtracdencWorker] Module.setLogger is not available');
                            }

                            self.postMessage({ action: 'init' });
                        })
                        .catch((error: any) => {
                            console.error('[AtracdencWorker] Error initializing Module:', error);
                            self.postMessage({
                                action: 'error',
                                error: `Module initialization failed: ${error.message || 'Unknown error'}`,
                            });
                        });
                } catch (error) {
                    console.error('[AtracdencWorker] Error in init action:', error);
                    self.postMessage({ action: 'error', error: `Init failed: ${error.message || 'Unknown error'}` });
                }
            } else if (action === 'encode') {
                try {
                    if (!Module) {
                        throw new Error('Module not initialized. Call init first.');
                    }

                    const { bitrate, data } = others;
                    console.log(`[AtracdencWorker] Encoding with bitrate: ${bitrate}, data size: ${data.byteLength}bytes`);

                    // Prepare files
                    const inWavFile = `inWavFile.wav`;
                    const outAt3File = `outAt3File.aea`;
                    const dataArray = new Uint8Array(data);

                    console.log(`[AtracdencWorker] Writing input WAV file: ${inWavFile}`);
                    Module.FS.writeFile(`${inWavFile}`, dataArray);

                    // Execute encoding
                    console.log('[AtracdencWorker] Starting ATRAC3 encoding process');
                    Module.callMain([`-e`, `atrac3`, `-i`, inWavFile, `-o`, outAt3File, `--bitrate`, bitrate]);

                    // Read result file
                    console.log(`[AtracdencWorker] Reading output file: ${outAt3File}`);
                    let fileStat = Module.FS.stat(outAt3File);
                    let size = fileStat.size;
                    console.log(`[AtracdencWorker] Output file size: ${size}bytes`);

                    // Remove header (96 bytes)
                    let tmp = new Uint8Array(size - 96);
                    let outAt3FileStream = Module.FS.open(outAt3File, 'r');
                    Module.FS.read(outAt3FileStream, tmp, 0, tmp.length, 96);
                    Module.FS.close(outAt3FileStream);

                    let result = tmp.buffer;
                    console.log(`[AtracdencWorker] Encoding completed, result size: ${result.byteLength}bytes`);

                    // Return completed result
                    self.postMessage(
                        {
                            action: 'encode',
                            result,
                        },
                        [result]
                    );
                } catch (error) {
                    console.error('[AtracdencWorker] Error in encode action:', error);
                    self.postMessage({
                        action: 'error',
                        error: `Encode failed: ${error.message || 'Unknown error'}`,
                    });
                }
            } else {
                console.warn(`[AtracdencWorker] Unknown action: ${action}`);
                self.postMessage({
                    action: 'error',
                    error: `Unknown action: ${action}`,
                });
            }
        } catch (error) {
            console.error('[AtracdencWorker] Unhandled error in worker:', error);
            self.postMessage({
                action: 'error',
                error: `Unhandled error: ${error.message || 'Unknown error'}`,
            });
        }
    };
} else {
    // Main
}
