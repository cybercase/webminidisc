import { createWorker, setLogging } from '@ffmpeg/ffmpeg';
import { AtracdencProcess } from './atracdenc-worker';
import { getAtrac3Info, getPublicPathFor } from '../utils';
import { Wireformat } from 'netmd-js';
import { WireformatDict } from '../redux/actions';
const AtracdencWorker = require('worker-loader!./atracdenc-worker'); // eslint-disable-line import/no-webpack-loader-syntax

interface LogPayload {
    message: string;
    action: string;
}

export interface AudioExportService {
    init(): Promise<void>;
    export(params: { requestedFormat: 'SP' | 'LP2' | 'LP4' }): Promise<{ data: ArrayBuffer; format: Wireformat }>;
    info(): Promise<{ format: string | null; input: string | null }>;
    prepare(file: File): Promise<void>;
}

export class FFMpegAudioExportService implements AudioExportService {
    public ffmpegProcess: any;
    public atracdencProcess?: AtracdencProcess;
    public loglines: { action: string; message: string }[] = [];
    public inFileName: string = ``;
    public outFileNameNoExt: string = ``;
    public inFile?: File;

    async init() {
        console.log('[AudioExport] Initializing FFMpegAudioExportService');
        setLogging(true);
    }

    async prepare(file: File) {
        try {
            console.log(`[AudioExport] Preparing file: ${file.name}, size: ${file.size}bytes, type: ${file.type}`);
            this.inFile = file;
            this.loglines = [];

            // Initialize FFmpeg web worker
            console.log('[AudioExport] Creating FFmpeg worker');
            this.ffmpegProcess = createWorker({
                logger: (payload: LogPayload) => {
                    this.loglines.push(payload);
                    console.log(`[FFmpeg] ${payload.action}: ${payload.message}`);
                },
                corePath: getPublicPathFor('ffmpeg-core.js'),
                workerPath: getPublicPathFor('worker.min.js'),
            });

            console.log('[AudioExport] Loading FFmpeg worker');
            await this.ffmpegProcess.load();
            console.log('[AudioExport] FFmpeg worker loaded successfully');

            // Initialize Atracdenc web worker
            console.log('[AudioExport] Creating Atracdenc worker');
            this.atracdencProcess = new AtracdencProcess(new AtracdencWorker());
            console.log('[AudioExport] Initializing Atracdenc worker');
            await this.atracdencProcess.init();
            console.log('[AudioExport] Atracdenc worker initialized successfully');

            // Extract file extension
            let ext = file.name.split('.').slice(-1);
            if (ext.length === 0) {
                throw new Error(`Unrecognized file format: ${file.name}`);
            }

            this.inFileName = `inAudioFile.${ext[0]}`;
            this.outFileNameNoExt = `outAudioFile`;

            console.log(`[AudioExport] Writing file to FFmpeg: ${this.inFileName}`);
            await this.ffmpegProcess.write(this.inFileName, file);
            console.log('[AudioExport] File written to FFmpeg successfully');
        } catch (error) {
            console.error('[AudioExport] Error in prepare:', error);
            throw error;
        }
    }

    async info() {
        try {
            console.log(`[AudioExport] Getting file info for: ${this.inFileName}`);
            await this.ffmpegProcess.transcode(this.inFileName, `${this.outFileNameNoExt}.metadata`, `-f ffmetadata`);

            let audioFormatRegex = /Audio:\s(.*?),/; // Actual content
            let inputFormatRegex = /Input #0,\s(.*?),/; // Container
            let format: string | null = null;
            let input: string | null = null;

            for (let line of this.loglines) {
                let match = line.message.match(audioFormatRegex);
                if (match !== null) {
                    format = match[1];
                    continue;
                }
                match = line.message.match(inputFormatRegex);
                if (match !== null) {
                    input = match[1];
                    continue;
                }
                if (format !== null && input !== null) {
                    break;
                }
            }

            console.log(`[AudioExport] File info - format: ${format}, input: ${input}`);
            return { format, input };
        } catch (error) {
            console.error('[AudioExport] Error in info:', error);
            throw error;
        }
    }

    async export({ requestedFormat }: { requestedFormat: 'SP' | 'LP2' | 'LP4' | 'LP105' }) {
        try {
            console.log(`[AudioExport] Exporting with format: ${requestedFormat}`);
            let result: ArrayBuffer;
            let format: Wireformat;

            // Check if file is already in ATRAC3 format
            console.log('[AudioExport] Checking if file is already in ATRAC3 format');
            const atrac3Info = await getAtrac3Info(this.inFile!);

            if (atrac3Info) {
                console.log(`[AudioExport] File is already in ATRAC3 format: ${atrac3Info.mode}`);
                format = WireformatDict[atrac3Info.mode];
                result = (await this.inFile!.arrayBuffer()).slice(atrac3Info.dataOffset);
            } else if (requestedFormat === `SP`) {
                console.log('[AudioExport] Converting to SP format (PCM)');
                const outFileName = `${this.outFileNameNoExt}.raw`;
                await this.ffmpegProcess.transcode(this.inFileName, outFileName, '-ac 2 -ar 44100 -f s16be');
                console.log('[AudioExport] Transcode to SP completed, reading output file');
                let { data } = await this.ffmpegProcess.read(outFileName);
                result = data.buffer;
                format = Wireformat.pcm;
                console.log('[AudioExport] SP conversion completed successfully');
            } else {
                console.log('[AudioExport] Converting to compressed format (LP2/LP4)');
                // First convert to WAV
                const outFileName = `${this.outFileNameNoExt}.wav`;
                console.log(`[AudioExport] Transcoding to WAV: ${outFileName}`);
                await this.ffmpegProcess.transcode(this.inFileName, outFileName, '-f wav -ar 44100 -ac 2');
                console.log('[AudioExport] Transcode to WAV completed, reading output file');
                let { data } = await this.ffmpegProcess.read(outFileName);
                console.log(`[AudioExport] WAV file read, size: ${data.buffer.byteLength}bytes`);

                let bitrate: string = `0`;
                switch (requestedFormat) {
                    case `LP2`:
                        bitrate = `128`;
                        format = Wireformat.lp2;
                        break;
                    case `LP105`:
                        bitrate = `102`;
                        format = Wireformat.l105kbps;
                        break;
                    case `LP4`:
                        bitrate = `64`;
                        format = Wireformat.lp4;
                        break;
                }

                console.log(`[AudioExport] Encoding to ATRAC3 with bitrate: ${bitrate}`);
                result = await this.atracdencProcess!.encode(data.buffer, bitrate);
                console.log(`[AudioExport] ATRAC3 encoding completed, size: ${result.byteLength}bytes`);
            }

            console.log('[AudioExport] Terminating workers');
            this.ffmpegProcess.worker.terminate();
            this.atracdencProcess!.terminate();

            console.log('[AudioExport] Export completed successfully');
            return {
                data: result,
                format,
            };
        } catch (error) {
            console.error('[AudioExport] Error in export:', error);
            if (this.ffmpegProcess) {
                try {
                    this.ffmpegProcess.worker.terminate();
                } catch (e) {
                    console.error('[AudioExport] Error terminating FFmpeg worker:', e);
                }
            }
            if (this.atracdencProcess) {
                try {
                    this.atracdencProcess.terminate();
                } catch (e) {
                    console.error('[AudioExport] Error terminating Atracdenc worker:', e);
                }
            }
            throw error;
        }
    }
}
