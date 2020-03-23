import React from 'react';
import { useShallowEqualSelector } from '../utils';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import LinearProgress from '@material-ui/core/LinearProgress';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
    progressPerc: {
        marginTop: theme.spacing(1),
    },
    progressBar: {
        marginTop: theme.spacing(3),
    },
    uploadLabel: {
        marginTop: theme.spacing(3),
    },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const UploadDialog = (props: {}) => {
    const classes = useStyles();

    let {
        visible,
        writtenProgress,
        encryptedProgress,
        totalProgress,

        trackTotal,
        trackCurrent,
        trackConverting,
        titleCurrent,
        titleConverting,
    } = useShallowEqualSelector(state => state.uploadDialog);

    let progressValue = Math.floor((writtenProgress / totalProgress) * 100);
    let bufferValue = Math.floor((encryptedProgress / totalProgress) * 100);
    let convertedValue = Math.floor((trackConverting / trackTotal) * 100);
    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="alert-dialog-slide-title"
            aria-describedby="alert-dialog-slide-description"
        >
            <DialogTitle id="alert-dialog-slide-title">Recording...</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-slide-description">
                    {convertedValue === 100 && trackConverting === trackTotal
                        ? `Conversion completed`
                        : `Converting ${trackConverting + 1} of ${trackTotal}: ${titleConverting}`}
                </DialogContentText>
                <LinearProgress
                    className={classes.progressBar}
                    variant={convertedValue === 0 ? 'indeterminate' : 'determinate'}
                    color="primary"
                    value={convertedValue}
                />
                <Box className={classes.progressPerc}>{convertedValue}%</Box>

                <DialogContentText id="alert-dialog-slide-description" className={classes.uploadLabel}>
                    Uploading {trackCurrent} of {trackTotal}: {titleCurrent}
                </DialogContentText>
                <LinearProgress
                    className={classes.progressBar}
                    variant="buffer"
                    color="secondary"
                    value={progressValue}
                    valueBuffer={bufferValue}
                />
                <Box className={classes.progressPerc}>{progressValue}%</Box>
            </DialogContent>
            <DialogActions></DialogActions>
        </Dialog>
    );
};
