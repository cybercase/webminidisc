import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { convertAndUpload } from '../redux/actions';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import FormControl from '@material-ui/core/FormControl';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { TransitionProps } from '@material-ui/core/transitions';
import { Typography } from '@material-ui/core';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
    },
    formControl: {
        minWidth: 60,
    },
    toggleButton: {
        minWidth: 40,
    },
    dialogContent: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    rightBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    titleFormControl: {
        marginTop: theme.spacing(1),
    },
}));

export const ConvertDialog = (props: { files: File[] }) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    let { visible, format, titleSource, titleFormat } = useShallowEqualSelector(state => state.convertDialog);

    const handleClose = useCallback(() => {
        dispatch(convertDialogActions.setVisible(false));
    }, [dispatch]);

    const handleChangeFormat = useCallback(
        (ev, newFormat) => {
            if (newFormat === null) {
                return;
            }
            dispatch(convertDialogActions.setFormat(newFormat));
        },
        [dispatch]
    );

    const handleChangeTitleSource = useCallback(
        (ev, newTitleSource) => {
            if (newTitleSource === null) {
                return;
            }
            dispatch(convertDialogActions.setTitleSource(newTitleSource));
        },
        [dispatch]
    );

    const handleChangeTitleFormat = useCallback(
        (event: React.ChangeEvent<{ value: any }>) => {
            dispatch(convertDialogActions.setTitleFormat(event.target.value));
        },
        [dispatch]
    );

    const handleConvert = useCallback(() => {
        handleClose();
        dispatch(convertAndUpload(props.files, format, titleSource, titleFormat));
    }, [dispatch, props, format, titleSource, titleFormat, handleClose]);

    return (
        <Dialog
            open={visible}
            maxWidth={'xs'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="convert-dialog-slide-title"
            aria-describedby="convert-dialog-slide-description"
        >
            <DialogTitle id="convert-dialog-slide-title">Upload Settings</DialogTitle>
            <DialogContent className={classes.dialogContent}>
                <FormControl>
                    <Typography component="label" variant="caption" color="textSecondary">
                        Recording Mode
                    </Typography>
                    <ToggleButtonGroup value={format} exclusive onChange={handleChangeFormat} size="small">
                        <ToggleButton className={classes.toggleButton} value="SP">
                            SP
                        </ToggleButton>
                        <ToggleButton className={classes.toggleButton} value="LP2">
                            LP2
                        </ToggleButton>
                        <ToggleButton className={classes.toggleButton} value="LP4">
                            LP4
                        </ToggleButton>
                    </ToggleButtonGroup>
                </FormControl>
                <div className={classes.rightBlock}>
                    <FormControl className={classes.formControl}>
                        <Typography component="label" variant="caption" color="textSecondary">
                            Track title
                        </Typography>
                        <ToggleButtonGroup value={titleSource} exclusive onChange={handleChangeTitleSource} size="small">
                            <ToggleButton className={classes.toggleButton} value="file">
                                Filename
                            </ToggleButton>
                            <ToggleButton className={classes.toggleButton} value="media">
                                Media tags
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </FormControl>
                    {titleSource === 'media' ? (
                        <FormControl className={classes.titleFormControl}>
                            <Select value={titleFormat} color="secondary" input={<Input />} onChange={handleChangeTitleFormat}>
                                <MenuItem value={`title`}>Title</MenuItem>
                                <MenuItem value={`album-title`}>Album - Title</MenuItem>
                                <MenuItem value={`artist-title`}>Artist - Title</MenuItem>
                                <MenuItem value={`artist-album-title`}>Artist - Album - Title</MenuItem>
                            </Select>
                        </FormControl>
                    ) : null}
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConvert}>Ok</Button>
            </DialogActions>
        </Dialog>
    );
};
