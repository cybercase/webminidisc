import { sanitizeTitle, getPublicPathFor } from '../utils';
import Recorder from 'recorderjs';

export class MediaRecorderService {
    public recorder: any;
    public stream?: MediaStream;
    public audioContext?: AudioContext;
    public analyserNode?: AnalyserNode;
    public gainNode?: GainNode;

    playTestInput(deviceId: string) {
        this.audioContext = new AudioContext();
        this.gainNode = this.audioContext.createGain();
        this.analyserNode = this.audioContext.createAnalyser();

        this.initStream(deviceId).then(() => {
            const source = this.audioContext!.createMediaStreamSource(this.stream!);
            source.connect(this.gainNode!);
            this.gainNode!.connect(this.analyserNode!);
            this.analyserNode!.connect(this.audioContext!.destination);
        });
    }

    stopTestInput() {
        if (!this.audioContext) {
            return;
        }
        this.audioContext?.close();
        delete this.audioContext;
        this.closeStream();
    }

    async initStream(deviceId: string) {
        const recordConstraints = {
            // Try to set the best recording params for ripping the audio tracks
            autoGainControl: false,
            channelCount: 2,
            deviceId: deviceId,
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 44100,
            highpassFilter: false,
        };
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: recordConstraints });

        // Dump recording settings
        const audioTracks = this.stream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log('Record Setings:', audioTracks[0].getSettings());
        }
    }

    async startRecording() {
        this.audioContext = new AudioContext();
        const input = this.audioContext.createMediaStreamSource(this.stream!);
        this.recorder = new Recorder(input, { workerPath: getPublicPathFor(`recorderWorker.js`) });
        this.recorder.record();
    }

    async stopRecording() {
        this.recorder.stop();
    }

    async closeStream() {
        this.stream?.getTracks().forEach(track => track.stop());
    }

    downloadRecorded(title: string) {
        this.recorder.exportWAV((buffer: Blob) => {
            let url = URL.createObjectURL(buffer);
            let a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            a.download = `${sanitizeTitle(title)}.wav`;
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    }
}
