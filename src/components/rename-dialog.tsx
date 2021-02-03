import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { renameTrack, renameDisc } from '../redux/actions';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { TransitionProps } from '@material-ui/core/transitions';
import { W95RenameDialog } from './win95/rename-dialog';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const RenameDialog = (props: {}) => {
    let dispatch = useDispatch();

    let renameDialogVisible = useShallowEqualSelector(state => state.renameDialog.visible);
    let renameDialogTitle = useShallowEqualSelector(state => state.renameDialog.title);
    let renameDialogIndex = useShallowEqualSelector(state => state.renameDialog.index);

    const what = renameDialogIndex < 0 ? `Disc` : `Track`;

    const handleCancelRename = () => {
        dispatch(renameDialogActions.setVisible(false));
    };

    const handleDoRename = () => {
        if (renameDialogIndex < 0) {
            dispatch(renameDisc({ newName: renameDialogTitle }));
        } else {
            dispatch(renameTrack({ index: renameDialogIndex, newName: renameDialogTitle }));
        }
    };

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            dispatch(renameDialogActions.setCurrentName(event.target.value.substring(0, 120))); // MAX title length
        },
        [dispatch]
    );

    const { vintageMode } = useShallowEqualSelector(state => state.appState);
    if (vintageMode) {
        const p = {
            renameDialogVisible,
            renameDialogTitle,
            renameDialogIndex,
            what,
            handleCancelRename,
            handleDoRename,
            handleChange,
        };
        return <W95RenameDialog {...p} />;
    }

    return (
        <Dialog
            open={renameDialogVisible}
            onClose={handleCancelRename}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="rename-dialog-title"
        >
            <DialogTitle id="rename-dialog-title">Rename {what}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    id="name"
                    label={`${what} Name`}
                    type="text"
                    fullWidth
                    value={renameDialogTitle}
                    onKeyDown={event => {
                        event.key === `Enter` && handleDoRename();
                    }}
                    onChange={handleChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancelRename}>Cancel</Button>
                <Button color={'primary'} onClick={handleDoRename}>
                    Rename
                </Button>
            </DialogActions>
        </Dialog>
    );
};
