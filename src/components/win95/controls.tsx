import React from 'react';
import { Button, Panel } from 'react95';
import { belowDesktop } from '../../utils';

import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import PauseIcon from '@material-ui/icons/Pause';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
    container: {
        display: 'flex',
        flex: '1 1 auto',
        alignItems: 'center',
        [belowDesktop(theme)]: {
            flexWrap: 'wrap',
        },
    },
    lcd: {
        backgroundColor: 'black !important',
        flex: '1 1 auto',
        margin: '0 80px 0 0px',
        minWidth: 150,
        height: 48,
        color: 'white !important',
        fontFamily: 'LCDDot',
    },
}));

export const W95Controls = (props: {
    handlePrev: () => void;
    handlePlay: () => void;
    handleStop: () => void;
    handlePause: () => void;
    handleNext: () => void;
    message: string;
    discPresent: boolean;
    classes: any;
    lcdScroll: number;
    lcdRef: React.RefObject<HTMLParagraphElement>;
    lcdScrollDuration: number;
}) => {
    const classes = useStyles();
    return (
        <div className={classes.container}>
            <Button onClick={props.handlePrev}>
                <SkipPreviousIcon />
            </Button>
            <Button onClick={props.handlePlay}>
                <PlayArrowIcon />
            </Button>
            <Button onClick={props.handlePause}>
                <PauseIcon />
            </Button>
            <Button onClick={props.handleStop}>
                <StopIcon />
            </Button>
            <Button onClick={props.handleNext} style={{ marginRight: 16 }}>
                <SkipNextIcon />
            </Button>

            <Panel variant="well" className={classes.lcd}>
                <div className={props.classes.lcdText} style={{ left: 16, width: 'calc(100% - 16px)' }}>
                    <span
                        className={props.lcdScroll ? props.classes.scrollingStatusMessage : props.classes.statusMessage}
                        ref={props.lcdRef}
                        style={
                            props.message && props.lcdScroll > 0
                                ? {
                                      animationDuration: `${props.lcdScrollDuration}s`,
                                      transform: `translate(-${props.lcdScroll}%)`,
                                      top: 12,
                                  }
                                : { top: 12 }
                        }
                    >
                        {props.message}
                    </span>
                </div>
            </Panel>
        </div>
    );
};
