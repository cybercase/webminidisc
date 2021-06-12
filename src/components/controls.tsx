import React, { useCallback, useRef, useEffect, useState } from 'react';

import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import PauseIcon from '@material-ui/icons/Pause'

import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';

import { makeStyles } from '@material-ui/core';
import { belowDesktop, getSortedTracks, useShallowEqualSelector } from '../utils';
import { control } from '../redux/actions';
import { useDispatch } from 'react-redux';

import { ReactComponent as MDIcon0 } from '../images/md0.svg';
import { ReactComponent as MDIcon1 } from '../images/md1.svg';
import { ReactComponent as MDIcon2 } from '../images/md2.svg';
import { ReactComponent as MDIcon3 } from '../images/md3.svg';
import { W95Controls } from './win95/controls';

const frames = [MDIcon0, MDIcon1, MDIcon2, MDIcon3];

const useStyles = makeStyles(theme => ({
    '@keyframes scrollLeft': {
        from: {
            transform: `translateX(0%)`,
        },
        to: {},
    },
    '@keyframes blink': {
        '50%': {
            visibility: 'hidden',
        },
    },
    container: {
        display: 'flex',
        flex: '1 1 auto',
        [belowDesktop(theme)]: {
            flexWrap: 'wrap',
        },
    },
    lcd: {
        flex: '1 1 auto',
        position: 'relative',
        marginLeft: theme.spacing(1.5),
        marginRight: theme.spacing(1.5),
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
        borderRadius: theme.spacing(3),
        backgroundColor: theme.palette.background.default,
        minWidth: 150,
        height: 48,
        [belowDesktop(theme)]: {
            marginLeft: 0,
            marginRight: theme.spacing(2),
        },
    },
    lcdText: {
        overflow: 'hidden',
        position: 'relative',
        width: 'calc(100% - 40px)',
        left: 40,
        height: '100%',
        fontFamily: 'LCDDot',
    },
    lcdDisc: {
        position: 'absolute',
        top: 0,
        left: 20,
    },
    lcdDiscIcon: {
        width: 28,
        height: 48,
        '& g': {
            fill: theme.palette.action.active,
        },
    },
    scrollingStatusMessage: {
        position: 'absolute',
        width: '100%',
        whiteSpace: 'nowrap',
        animationName: '$scrollLeft',
        animationTimingFunction: 'linear',
        animationIterationCount: '1',
        top: 15,
        left: 1,
    },
    statusMessage: {
        position: 'absolute',
        width: '100%',
        whiteSpace: 'nowrap',
        top: 15,
        left: 1,
    },
    lcdBlink:{
        animationName: '$blink',
        animationTimingFunction: 'step-end',
        animationDuration: '1s',
        animationIterationCount: 'infinite'
    },
    button: {
        // padding: 8,
    },
}));

export const Controls = () => {
    const dispatch = useDispatch();
    // TODO: The shallow equality won't work for these 2 states
    const deviceStatus = useShallowEqualSelector(state => state.main.deviceStatus);
    const disc = useShallowEqualSelector(state => state.main.disc);

    const classes = useStyles();
    const handlePrev = useCallback(() => {
        dispatch(control('prev'));
    }, [dispatch]);
    const handlePlay = useCallback(() => {
        dispatch(control('play'));
    }, [dispatch]);
    const handleStop = useCallback(() => {
        dispatch(control('stop'));
    }, [dispatch]);
    const handleNext = useCallback(() => {
        dispatch(control('next'));
    }, [dispatch]);
    const handlePause = useCallback(() => {
        dispatch(control('pause'));
    }, [dispatch]);

    let message = ``;
    let trackIndex = deviceStatus?.track ?? null;
    let deviceState = deviceStatus?.state ?? null;
    let discPresent = deviceStatus?.discPresent ?? false;
    let paused = deviceStatus?.state === "paused";
    const tracks = getSortedTracks(disc);
    if (!discPresent) {
        message = ``;
    } else if (deviceState === 'readingTOC') {
        message = 'READING TOC';
    } else if (tracks.length === 0) {
        message = `BLANKDISC`;
    } else if (deviceStatus && deviceStatus.track !== null && tracks[deviceStatus.track]) {
        message = `${deviceStatus.track + 1} - ` + tracks[deviceStatus.track].title;
    }

    const [lcdScroll, setLcdScroll] = useState(0);
    const [lcdScrollDuration, setLcdScrollDuration] = useState(0);
    const [lcdIconFrame, setLcdIconFrame] = useState(0);

    // LCD Text scrolling
    const animationDelayInMS = 2000;
    const scrollTimerRef = useRef<any>(null);
    const lcdRef = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        const updateLCDScroll = () => {
            const domEl = lcdRef.current;
            const textWidth = domEl?.scrollWidth ?? 0;
            const lcdWidth = domEl?.parentElement?.offsetWidth ?? 0;
            const scrollPerc = textWidth > lcdWidth ? (textWidth * 100) / lcdWidth : 0;
            const scrollDurationInSec = textWidth > lcdWidth ? textWidth / 20 : 0; // Compute duration to achieve constant speed
            setLcdScroll(scrollPerc);
            setLcdScrollDuration(scrollDurationInSec);
            if (scrollDurationInSec > 0) {
                scrollTimerRef.current = setTimeout(() => {
                    setLcdScroll(0);
                }, scrollDurationInSec * 1000 + 500); // stop animation timer
            }
        };

        clearTimeout(scrollTimerRef.current);
        setLcdScroll(0);
        scrollTimerRef.current = setTimeout(() => {
            updateLCDScroll();
        }, animationDelayInMS); // start animation timer

        return () => {
            clearTimeout(scrollTimerRef.current); // clear all the timers on unmount
        };
    }, [trackIndex, deviceState, message]);

    // Disc animation
    const lcdIconAnimationTimer = useRef<any>(null);
    useEffect(() => {
        clearInterval(lcdIconAnimationTimer.current);
        if (deviceState === 'playing' || deviceState === 'readingTOC') {
            lcdIconAnimationTimer.current = setInterval(() => {
                setLcdIconFrame(1 + (lcdIconFrame % (frames.length - 1)));
            }, 600);
        } else {
            setLcdIconFrame(0);
        }
        return () => {
            clearInterval(lcdIconAnimationTimer.current);
        };
    }, [deviceState, lcdIconFrame]);

    const DiscFrame = frames[lcdIconFrame];

    const vintageMode = useShallowEqualSelector(state => state.appState.vintageMode);
    if (vintageMode) {
        const p = {
            handlePrev,
            handlePlay,
            handleStop,
            handlePause,
            handleNext,

            message,
            discPresent,
            lcdScroll,
            lcdRef,
            lcdScrollDuration,

            classes,
        };
        return <W95Controls {...p} />;
    }

    return (
        <Box className={classes.container}>
            <IconButton aria-label="prev" onClick={handlePrev} className={classes.button}>
                <SkipPreviousIcon />
            </IconButton>
            <IconButton aria-label="play" onClick={handlePlay} className={classes.button}>
                <PlayArrowIcon />
            </IconButton>
            <IconButton aria-label="pause" onClick={handlePause} className={classes.button}>
                <PauseIcon />
            </IconButton>
            <IconButton aria-label="stop" onClick={handleStop} className={classes.button}>
                <StopIcon />
            </IconButton>
            <IconButton aria-label="next" onClick={handleNext} className={classes.button}>
                <SkipNextIcon />
            </IconButton>
            <div className={classes.lcd}>
                <div className={classes.lcdText}>
                    <span
                        className={lcdScroll ? classes.scrollingStatusMessage : classes.statusMessage}
                        ref={lcdRef}
                        style={
                            message && lcdScroll > 0
                                ? { animationDuration: `${lcdScrollDuration}s`, transform: `translate(-${lcdScroll}%)` }
                                : {}
                        }
                    >
                        {message}
                    </span>
                </div>
                <div className={classes.lcdDisc}>{discPresent && <DiscFrame className={classes.lcdDiscIcon + (paused ? ' ' + classes.lcdBlink : '')} />}</div>
            </div>
        </Box>
    );
};
