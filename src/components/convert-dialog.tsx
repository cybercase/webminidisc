import React from 'react';
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
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import { TransitionProps } from '@material-ui/core/transitions';

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
        minWidth: 120,
    },
}));

export const ConvertDialog = (props: { files: File[] }) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    let { visible, format } = useShallowEqualSelector(state => state.convertDialog);

    const handleClose = () => {
        dispatch(convertDialogActions.setVisible(false));
    };

    const handleChange = (ev: React.ChangeEvent<{ value: unknown }>) => {
        dispatch(convertDialogActions.setFormat(ev.target.value as string));
    };

    const handleConvert = () => {
        handleClose();
        dispatch(convertAndUpload(props.files, format));
    };

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
            <DialogContent>
                <FormControl className={classes.formControl}>
                    <InputLabel color="secondary" id="convert-dialog-format">
                        Format
                    </InputLabel>
                    <Select
                        labelId="convert-dialog-format-label"
                        id="convert-dialog-format"
                        value={format}
                        color="secondary"
                        onChange={handleChange}
                        input={<Input />}
                    >
                        <MenuItem value={`SP`}>SP</MenuItem>
                        <MenuItem value={`LP2`}>LP2</MenuItem>
                        <MenuItem value={`LP4`}>LP4</MenuItem>
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConvert}>Ok</Button>
            </DialogActions>
        </Dialog>
    );
};
