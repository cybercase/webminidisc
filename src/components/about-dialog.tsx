import React from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as appActions } from '../redux/app-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const AboutDialog = (props: {}) => {
    const dispatch = useDispatch();

    let visible = useShallowEqualSelector(state => state.appState.aboutDialogVisible);

    const handleClose = () => {
        dispatch(appActions.showAboutDialog(false));
    };

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="about-dialog-slide-title"
        >
            <DialogTitle id="about-dialog-slide-title">About Web MiniDisc</DialogTitle>
            <DialogContent>
                <DialogContentText>Web MiniDisc has been made possible by</DialogContentText>
                <ul>
                    <li>
                        <Link rel="noopener noreferrer" href="https://www.ffmpeg.org/" target="_blank">
                            FFmpeg
                        </Link>{' '}
                        and{' '}
                        <Link rel="noopener noreferrer" href="https://github.com/ffmpegjs/FFmpeg" target="_blank">
                            ffmpegjs
                        </Link>
                        , to read your audio files (wav, mp3, ogg, mp4, etc...).
                    </li>
                    <li>
                        <Link rel="noopener noreferrer" href="https://github.com/dcherednik/atracdenc/" target="_blank">
                            Atracdenc
                        </Link>
                        , to support atrac3 encoding (lp2, lp4 audio formats).
                    </li>
                    <li>
                        <Link rel="noopener noreferrer" href="https://emscripten.org/" target="_blank">
                            Emscripten
                        </Link>
                        , to run both FFmpeg and Atracdenc in the browser.
                    </li>
                    <li>
                        <Link rel="noopener noreferrer" href="https://github.com/cybercase/netmd-js" target="_blank">
                            netmd-js
                        </Link>
                        , to send commands to NetMD devices using Javascript.
                    </li>
                    <li>
                        <Link rel="noopener noreferrer" href="https://github.com/glaubitz/linux-minidisc" target="_blank">
                            linux-minidisc
                        </Link>
                        , to make the netmd-js project possible.
                    </li>
                    <li>
                        <Link rel="noopener noreferrer" href="https://material-ui.com/" target="_blank">
                            material-ui
                        </Link>
                        , to build the user interface.
                    </li>
                </ul>
                <DialogContentText>Attribution</DialogContentText>
                <ul>
                    <li>
                        MiniDisc logo from{' '}
                        <Link rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/MiniDisc" target="_blank">
                            https://en.wikipedia.org/wiki/MiniDisc
                        </Link>
                    </li>
                    <li>
                        MiniDisc icon from{' '}
                        <Link
                            rel="noopener noreferrer"
                            href="https://www.deviantart.com/blinkybill/art/Sony-MiniDisc-Plastic-Icon-473812540"
                            target="_blank"
                        >
                            http://fav.me/d7u3g3g
                        </Link>
                    </li>
                </ul>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
