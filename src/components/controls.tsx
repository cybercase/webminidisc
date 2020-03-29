import React, { useCallback } from 'react';

import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import StopIcon from '@material-ui/icons/Stop';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';

import IconButton from '@material-ui/core/IconButton';
import Box from '@material-ui/core/Box';

import serviceRegistry from '../services/registry';

export const Controls = () => {
    const handlePrev = useCallback(() => {
        serviceRegistry.netmdService?.prev();
    }, []);
    const handlePlay = useCallback(() => {
        serviceRegistry.netmdService?.play();
    }, []);
    const handleStop = useCallback(() => {
        serviceRegistry.netmdService?.stop();
    }, []);
    const handleNext = useCallback(() => {
        serviceRegistry.netmdService?.next();
    }, []);
    return (
        <Box>
            <IconButton aria-label="prev" onClick={handlePrev}>
                <SkipPreviousIcon />
            </IconButton>
            <IconButton aria-label="play" onClick={handlePlay}>
                <PlayArrowIcon />
            </IconButton>
            <IconButton aria-label="stop" onClick={handleStop}>
                <StopIcon />
            </IconButton>
            <IconButton aria-label="next" onClick={handleNext}>
                <SkipNextIcon />
            </IconButton>
        </Box>
    );
};
