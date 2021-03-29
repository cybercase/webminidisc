import React from 'react';
import { Button, WindowHeader, Anchor } from 'react95';
import { FooterButton, DialogOverlay, DialogWindow, DialogFooter, DialogWindowContent, WindowCloseIcon } from './common';

export const W95AboutDialog = (props: { visible: boolean; handleClose: () => void }) => {
    if (!props.visible) {
        return null;
    }

    return (
        <DialogOverlay>
            <DialogWindow>
                <WindowHeader style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: '1 1 auto' }}>About Web MiniDisc</span>
                    <Button onClick={props.handleClose}>
                        <WindowCloseIcon />
                    </Button>
                </WindowHeader>
                <DialogWindowContent>
                    Web MiniDisc uses
                    <ul>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://www.ffmpeg.org/" target="_blank">
                                FFmpeg
                            </Anchor>{' '}
                            and{' '}
                            <Anchor rel="noopener noreferrer" href="https://github.com/ffmpegjs/FFmpeg" target="_blank">
                                ffmpegjs
                            </Anchor>
                            , to read your audio files (wav, mp3, ogg, mp4, etc...).
                        </li>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://github.com/dcherednik/atracdenc/" target="_blank">
                                Atracdenc
                            </Anchor>
                            , to support atrac3 encoding (lp2, lp4 audio formats).
                        </li>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://emscripten.org/" target="_blank">
                                Emscripten
                            </Anchor>
                            , to run both FFmpeg and Atracdenc in the browser.
                        </li>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://github.com/cybercase/netmd-js" target="_blank">
                                netmd-js
                            </Anchor>
                            , to send commands to NetMD devices using Javascript.
                        </li>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://github.com/glaubitz/linux-minidisc" target="_blank">
                                linux-minidisc
                            </Anchor>
                            , to make the netmd-js project possible.
                        </li>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://react95.io/" target="_blank">
                                react85
                            </Anchor>
                            , to build the vintage user interface.
                        </li>
                        <li>
                            <Anchor rel="noopener noreferrer" href="https://material-ui.com/" target="_blank">
                                material-ui
                            </Anchor>
                            , to build the user interface.
                        </li>
                    </ul>
                    <DialogFooter>
                        <FooterButton onClick={props.handleClose}>OK</FooterButton>
                    </DialogFooter>
                </DialogWindowContent>
            </DialogWindow>
        </DialogOverlay>
    );
};
