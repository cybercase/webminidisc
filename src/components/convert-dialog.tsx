import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { belowDesktop, useShallowEqualSelector } from '../utils';

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
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import { lighten } from '@material-ui/core/styles';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Radio from '@material-ui/core/Radio';
import { useDropzone } from 'react-dropzone';
import Backdrop from '@material-ui/core/Backdrop';
import { W95ConvertDialog } from './win95/convert-dialog';

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
        flexDirection: 'column',
        justifyContent: 'stretch',
    },
    formatAndTitle: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    rightBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    titleFormControl: {
        minWidth: 170,
        marginTop: 4,
        [belowDesktop(theme)]: {
            width: 114,
            minWidth: 0,
        },
    },
    spacer: {
        display: 'flex',
        flex: '1 1 auto',
    },
    showTracksOrderBtn: {
        marginLeft: theme.spacing(1),
    },
    tracksOrderAccordion: {
        '&:before': {
            opacity: 0,
        },
    },
    tracksOrderAccordionDetail: {
        maxHeight: '40vh',
        overflow: 'auto',
    },
    toolbarHighlight:
        theme.palette.type === 'light'
            ? {
                  color: theme.palette.secondary.main,
                  backgroundColor: lighten(theme.palette.secondary.light, 0.85),
              }
            : {
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.secondary.dark,
              },
    trackList: {
        flex: '1 1 auto',
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}));

export const ConvertDialog = (props: { files: File[] }) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    let { visible, format, titleFormat } = useShallowEqualSelector(state => state.convertDialog);

    // Track reodering
    const [files, setFiles] = useState(props.files);
    const [selectedTrackIndex, setSelectedTrack] = useState(-1);

    const moveFile = useCallback(
        (offset: number) => {
            const targetIndex = selectedTrackIndex + offset;
            if (targetIndex >= files.length || targetIndex < 0) {
                return; // This should not be allowed by the UI
            }

            const newFileArray = files.slice();

            // Swap trakcs
            let tmp = newFileArray[selectedTrackIndex];
            newFileArray[selectedTrackIndex] = newFileArray[targetIndex];
            newFileArray[targetIndex] = tmp;

            setFiles(newFileArray);
            setSelectedTrack(targetIndex);
        },
        [files, selectedTrackIndex]
    );

    const moveFileUp = useCallback(() => {
        moveFile(-1);
    }, [moveFile]);

    const moveFileDown = useCallback(() => {
        moveFile(1);
    }, [moveFile]);

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

    const handleChangeTitleFormat = useCallback(
        (event: React.ChangeEvent<{ value: any }>) => {
            dispatch(convertDialogActions.setTitleFormat(event.target.value));
        },
        [dispatch]
    );

    const handleConvert = useCallback(() => {
        handleClose();
        dispatch(convertAndUpload(files, format, titleFormat));
    }, [dispatch, files, format, titleFormat, handleClose]);

    const [tracksOrderVisible, setTracksOrderVisible] = useState(false);
    const handleToggleTracksOrder = useCallback(() => {
        setTracksOrderVisible(!tracksOrderVisible);
    }, [tracksOrderVisible, setTracksOrderVisible]);

    // Dialog init on new files
    useEffect(() => {
        const newFiles = Array.from(props.files);
        setFiles(newFiles);
        setSelectedTrack(-1);
        setTracksOrderVisible(false);
    }, [props.files, setSelectedTrack, setTracksOrderVisible]);

    // scroll selected track into view
    const selectedTrackRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        selectedTrackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedTrackRef, selectedTrackIndex]);

    const renderTracks = useCallback(() => {
        return files.map((file, i) => {
            const isSelected = selectedTrackIndex === i;
            const ref = isSelected ? selectedTrackRef : null;
            return (
                <ListItem key={`${i}`} disableGutters={true} onClick={() => setSelectedTrack(i)} ref={ref} button>
                    <ListItemIcon>
                        <Radio checked={isSelected} value={`track-${i}`} size="small" />
                    </ListItemIcon>
                    <ListItemText primary={file.name} />
                </ListItem>
            );
        });
    }, [files, selectedTrackIndex, setSelectedTrack, selectedTrackRef]);

    // Add/Remove tracks
    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: File[]) => {
            const newFileArray = files.slice().concat(acceptedFiles);
            setFiles(newFileArray);
        },
        [files, setFiles]
    );
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: [`audio/*`, `video/mp4`],
        noClick: true,
    });
    const disableRemove = selectedTrackIndex < 0 || selectedTrackIndex >= files.length;
    const handleRemoveSelectedTrack = useCallback(() => {
        const newFileArray = files.filter((f, i) => i !== selectedTrackIndex);
        setFiles(newFileArray);
        if (selectedTrackIndex >= newFileArray.length) {
            setSelectedTrack(newFileArray.length - 1);
        }
    }, [selectedTrackIndex, files, setFiles]);

    const dialogVisible = useShallowEqualSelector(state => state.convertDialog.visible);
    useEffect(() => {
        if (dialogVisible && files.length === 0) {
            handleClose();
        }
    }, [files, dialogVisible, handleClose]);

    const vintageMode = useShallowEqualSelector(state => state.appState.vintageMode);
    if (vintageMode) {
        const p = {
            visible,
            format,
            titleFormat,

            files,
            setFiles,
            selectedTrackIndex,
            setSelectedTrack,

            moveFileUp,
            moveFileDown,

            handleClose,
            handleChangeFormat,
            handleChangeTitleFormat,
            handleConvert,

            tracksOrderVisible,
            setTracksOrderVisible,
            handleToggleTracksOrder,
            selectedTrackRef,

            getRootProps,
            getInputProps,
            isDragActive,
            open,

            disableRemove,
            handleRemoveSelectedTrack,
            dialogVisible,
        };
        return <W95ConvertDialog {...p} />;
    }

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
                <div className={classes.formatAndTitle}>
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
                            <FormControl className={classes.titleFormControl}>
                                <Select value={titleFormat} color="secondary" input={<Input />} onChange={handleChangeTitleFormat}>
                                    <MenuItem value={`filename`}>Filename</MenuItem>
                                    <MenuItem value={`title`}>Title</MenuItem>
                                    <MenuItem value={`album-title`}>Album - Title</MenuItem>
                                    <MenuItem value={`artist-title`}>Artist - Title</MenuItem>
                                    <MenuItem value={`title-artist`}>Title - Artist</MenuItem>
                                    <MenuItem value={`artist-album-title`}>Artist - Album - Title</MenuItem>
                                </Select>
                            </FormControl>
                        </FormControl>
                    </div>
                </div>
                <Accordion expanded={tracksOrderVisible} className={classes.tracksOrderAccordion} square={true}>
                    <div></div>
                    <div {...getRootProps()} style={{ outline: 'none' }}>
                        <Toolbar variant="dense" className={classes.toolbarHighlight}>
                            <IconButton edge="start" aria-label="add track" onClick={open}>
                                <AddIcon />
                            </IconButton>
                            <IconButton edge="start" aria-label="remove track" onClick={handleRemoveSelectedTrack} disabled={disableRemove}>
                                <RemoveIcon />
                            </IconButton>
                            <div className={classes.spacer}></div>
                            <IconButton edge="end" aria-label="move up" onClick={moveFileDown}>
                                <ExpandMoreIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="move down" onClick={moveFileUp}>
                                <ExpandLessIcon />
                            </IconButton>
                        </Toolbar>
                        <AccordionDetails className={classes.tracksOrderAccordionDetail}>
                            <List dense={true} disablePadding={false} className={classes.trackList}>
                                {renderTracks()}
                            </List>
                        </AccordionDetails>
                        <Backdrop className={classes.backdrop} open={isDragActive}>
                            Drop your Music to add it to the queue
                        </Backdrop>
                        <input {...getInputProps()} />
                    </div>
                </Accordion>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleToggleTracksOrder} className={classes.showTracksOrderBtn}>
                    {`${tracksOrderVisible ? 'Hide' : 'Show'} Tracks`}
                </Button>
                <div className={classes.spacer}></div>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConvert}>Ok</Button>
            </DialogActions>
        </Dialog>
    );
};
