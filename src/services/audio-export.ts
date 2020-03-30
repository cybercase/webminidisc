import { createWorker, setLogging } from '@ffmpeg/ffmpeg';
import { AtracdencProcess } from './atracdenc-worker';
import { getPublicPathFor } from '../utils';
const AtracdencWorker = require('worker-loader!./atracdenc-worker'); // eslint-disable-line import/no-webpack-loader-syntax

interface LogPayload {
    message: string;
    action: string;
}

export interface AudioExportService {
    init(): Promise<void>;
    export(params: { format: string }): Promise<ArrayBuffer>;
    info(): Promise<{ format: string | null; input: string | null }>;
    prepare(file: File): Promise<void>;
}

export class FFMpegAudioExportService implements AudioExportService {
    public ffmpegProcess: any;
    public atracdencProcess?: AtracdencProcess;
    public loglines: { action: string; message: string }[] = [];
    public inFileName: string = ``;
    public outFileNameNoExt: string = ``;

    async init() {
        setLogging(true);
    }

    async prepare(file: File) {
        this.loglines = [];
        this.ffmpegProcess = createWorker({
            logger: (payload: LogPayload) => {
                this.loglines.push(payload);
                console.log(payload.action, payload.message);
            },
            corePath: getPublicPathFor('ffmpeg-core.js'),
            workerPath: getPublicPathFor('worker.min.js'),
        });
        await this.ffmpegProcess.load();

        this.atracdencProcess = new AtracdencProcess(new AtracdencWorker());
        await this.atracdencProcess.init();

        let ext = file.name.split('.').slice(-1);
        if (ext.length === 0) {
            throw new Error(`Unrecognized file format: ${file.name}`);
        }

        this.inFileName = `inAudioFile.${ext[0]}`;
        this.outFileNameNoExt = `outAudioFile`;

        await this.ffmpegProcess.write(this.inFileName, file);
    }

    async info() {
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

        return { format, input };
    }

    async export({ format }: { format: string }) {
        let result: ArrayBuffer;
        if (format === `SP`) {
            const outFileName = `${this.outFileNameNoExt}.raw`;
            await this.ffmpegProcess.transcode(this.inFileName, outFileName, '-f s16be -ar 44100');
            let { data } = await this.ffmpegProcess.read(outFileName);
            result = data.buffer;
        } else {
            const outFileName = `${this.outFileNameNoExt}.wav`;
            await this.ffmpegProcess.transcode(this.inFileName, outFileName, '-f wav -ar 44100');
            let { data } = await this.ffmpegProcess.read(outFileName);
            let bitrate: string = `0`;
            switch (format) {
                case `LP2`:
                    bitrate = `128`;
                    break;
                case `LP105`:
                    bitrate = `102`;
                    break;
                case `LP4`:
                    bitrate = `64`;
                    break;
            }
            result = await this.atracdencProcess!.encode(data.buffer, bitrate);
        }
        this.ffmpegProcess.worker.terminate();
        this.atracdencProcess!.terminate();
        return result;
    }
}
