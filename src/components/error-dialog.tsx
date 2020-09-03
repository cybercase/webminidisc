import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as errorDialogActions } from '../redux/error-dialog-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { TransitionProps } from '@material-ui/core/transitions';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const ErrorDialog = (props: {}) => {
    const dispatch = useDispatch();

    let { visible, error } = useShallowEqualSelector(state => state.errorDialog);

    const handleClose = useCallback(() => {
        dispatch(errorDialogActions.setVisible(false));
    }, [dispatch]);

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="error-dialog-slide-title"
            aria-describedby="error-dialog-slide-description"
        >
            <DialogTitle id="alert-dialog-slide-title">Error</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-slide-description">{error}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
