export function createEmptyWave(time: number, sampleRate = 22050) {
    const numOfChan = 1;
    const depthInBytes = 2;
    const length = time * sampleRate * numOfChan * depthInBytes + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    let pos = 0;
    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // write WAVE header
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * numOfChan * depthInBytes);
    setUint16(numOfChan * depthInBytes);
    setUint16(depthInBytes * 8);

    setUint32(0x61746164);
    setUint32(length - pos - 4);

    return new Blob([buffer], { type: 'audio/wav' });
}
