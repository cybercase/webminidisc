import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';
import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DropResult,
    ResponderProvided,
    Droppable,
    DroppableProvided,
    DroppableStateSnapshot,
} from 'react-beautiful-dnd';
import { listContent, deleteTracks, moveTrack, groupTracks, deleteGroup, dragDropTrack } from '../redux/actions';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { actions as dumpDialogActions } from '../redux/dump-dialog-feature';

import { DeviceStatus, formatTimeFromFrames, Track } from 'netmd-js';
import { control } from '../redux/actions';

import { belowDesktop, forAnyDesktop, getGroupedTracks, getSortedTracks, isSequential, useShallowEqualSelector } from '../utils';

import { lighten, makeStyles } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Backdrop from '@material-ui/core/Backdrop';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import { batchActions } from 'redux-batched-actions';

import { GroupRow, TrackRow } from './main-rows';
import { RenameDialog } from './rename-dialog';
import { UploadDialog } from './upload-dialog';
import { RecordDialog } from './record-dialog';
import { ErrorDialog } from './error-dialog';
import { PanicDialog } from './panic-dialog';
import { ConvertDialog } from './convert-dialog';
import { AboutDialog } from './about-dialog';
import { DumpDialog } from './dump-dialog';
import { TopMenu } from './topmenu';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import { W95Main } from './win95/main';
import { useMemo } from 'react';

const useStyles = makeStyles(theme => ({
    add: {
        position: 'absolute',
        bottom: theme.spacing(3),
        right: theme.spacing(3),
        [belowDesktop(theme)]: {
            bottom: theme.spacing(2),
        },
    },
    main: {
        overflowY: 'auto',
        flex: '1 1 auto',
        marginBottom: theme.spacing(3),
        outline: 'none',
        marginLeft: theme.spacing(-1),
        marginRight: theme.spacing(-1),
        [forAnyDesktop(theme)]: {
            marginLeft: theme.spacing(-2),
            marginRight: theme.spacing(-2),
        },
    },
    toolbar: {
        marginTop: theme.spacing(3),
        marginLeft: theme.spacing(-2),
        marginRight: theme.spacing(-2),
        [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
            marginLeft: theme.spacing(-3),
            marginRight: theme.spacing(-3),
        },
    },
    toolbarLabel: {
        flex: '1 1 100%',
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
    headBox: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    spacing: {
        marginTop: theme.spacing(1),
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    remainingTimeTooltip: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
    },
    hoveringOverGroup: {
        backgroundColor: `${fade(theme.palette.secondary.dark, 0.4)}`,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
    },
}));

function getTrackStatus(track: Track, deviceStatus: DeviceStatus | null): 'playing' | 'paused' | 'none' {
    if (!deviceStatus || track.index !== deviceStatus.track) {
        return 'none';
    }

    if (deviceStatus.state === 'playing') {
        return 'playing';
    } else if (deviceStatus.state === 'paused') {
        return 'paused';
    } else {
        return 'none';
    }
}

export const Main = (props: {}) => {
    let dispatch = useDispatch();
    const disc = useShallowEqualSelector(state => state.main.disc);
    const deviceName = useShallowEqualSelector(state => state.main.deviceName);
    const deviceStatus = useShallowEqualSelector(state => state.main.deviceStatus);
    const { vintageMode } = useShallowEqualSelector(state => state.appState);

    const [selected, setSelected] = React.useState<number[]>([]);
    const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
    const [lastClicked, setLastClicked] = useState(-1);
    const [moveMenuAnchorEl, setMoveMenuAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleShowMoveMenu = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            setMoveMenuAnchorEl(event.currentTarget);
        },
        [setMoveMenuAnchorEl]
    );
    const handleCloseMoveMenu = useCallback(() => {
        setMoveMenuAnchorEl(null);
    }, [setMoveMenuAnchorEl]);

    const handleMoveSelectedTrack = useCallback(
        (destIndex: number) => {
            dispatch(moveTrack(selected[0], destIndex));
            handleCloseMoveMenu();
        },
        [dispatch, selected, handleCloseMoveMenu]
    );

    const handleDrop = useCallback(
        (result: DropResult, provided: ResponderProvided) => {
            if (!result.destination) return;
            let sourceList = parseInt(result.source.droppableId),
                sourceIndex = result.source.index,
                targetList = parseInt(result.destination.droppableId),
                targetIndex = result.destination.index;
            dispatch(dragDropTrack(sourceList, sourceIndex, targetList, targetIndex));
        },
        [dispatch]
    );

    const handleShowDumpDialog = useCallback(() => {
        dispatch(dumpDialogActions.setVisible(true));
    }, [dispatch]);

    useEffect(() => {
        dispatch(listContent());
    }, [dispatch]);

    useEffect(() => {
        setSelected([]); // Reset selection if disc changes
    }, [disc]);

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: File[]) => {
            setUploadedFiles(acceptedFiles);
            dispatch(convertDialogActions.setVisible(true));
        },
        [dispatch]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: [`audio/*`, `video/mp4`],
        noClick: true,
    });

    const classes = useStyles();
    const tracks = useMemo(() => getSortedTracks(disc), [disc]);
    const groupedTracks = useMemo(() => getGroupedTracks(disc), [disc]);

    // Action Handlers
    const handleSelectTrackClick = useCallback(
        (event: React.MouseEvent, item: number) => {
            if (event.shiftKey && selected.length && lastClicked !== -1) {
                let rangeBegin = Math.min(lastClicked + 1, item),
                    rangeEnd = Math.max(lastClicked - 1, item);
                let copy = [...selected];
                for (let i = rangeBegin; i <= rangeEnd; i++) {
                    let index = copy.indexOf(i);
                    if (index === -1) copy.push(i);
                    else copy.splice(index, 1);
                }
                if (!copy.includes(item)) copy.push(item);
                setSelected(copy);
            } else if (selected.includes(item)) {
                setSelected(selected.filter(i => i !== item));
            } else {
                setSelected([...selected, item]);
            }
            setLastClicked(item);
        },
        [selected, setSelected, lastClicked, setLastClicked]
    );

    const handleSelectAllClick = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (selected.length < tracks.length) {
                setSelected(tracks.map(t => t.index));
            } else {
                setSelected([]);
            }
        },
        [selected, tracks]
    );

    const handleRenameTrack = useCallback(
        (event: React.MouseEvent, index: number) => {
            let track = tracks.find(t => t.index === index);
            if (!track) {
                return;
            }

            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setGroupIndex(null),
                    renameDialogActions.setCurrentName(track.title),
                    renameDialogActions.setCurrentFullWidthName(track.fullWidthTitle),
                    renameDialogActions.setIndex(track.index),
                ])
            );
        },
        [dispatch, tracks]
    );

    const handleRenameGroup = useCallback(
        (event: React.MouseEvent, index: number) => {
            let group = groupedTracks.find(g => g.index === index);
            if (!group) {
                return;
            }

            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setGroupIndex(index),
                    renameDialogActions.setCurrentName(group.title ?? ''),
                    renameDialogActions.setCurrentFullWidthName(group.fullWidthTitle ?? ''),
                    renameDialogActions.setIndex(-1),
                ])
            );
        },
        [dispatch, groupedTracks]
    );

    const handleRenameActionClick = useCallback(
        (event: React.MouseEvent) => {
            if (event.detail !== 1) return; //Event retriggering when hitting enter in the dialog
            handleRenameTrack(event, selected[0]);
        },
        [handleRenameTrack, selected]
    );

    const handleDeleteSelected = useCallback(
        (event: React.MouseEvent) => {
            dispatch(deleteTracks(selected));
        },
        [dispatch, selected]
    );

    const handleGroupTracks = useCallback(
        (event: React.MouseEvent) => {
            dispatch(groupTracks(selected));
        },
        [dispatch, selected]
    );

    const handleDeleteGroup = useCallback(
        (event: React.MouseEvent, index: number) => {
            dispatch(deleteGroup(index));
        },
        [dispatch]
    );

    const handleTogglePlayPauseTrack = useCallback(
        (event: React.MouseEvent, track: number) => {
            if (!deviceStatus) {
                return;
            }
            if (deviceStatus.track !== track) {
                dispatch(control('goto', track));
                if (deviceStatus.state !== 'playing') {
                    dispatch(control('play'));
                }
            } else if (deviceStatus.state === 'playing') {
                dispatch(control('pause'));
            }
        },
        [dispatch, deviceStatus]
    );

    const canGroup = useMemo(() => {
        return (
            tracks.filter(n => n.group === null && selected.includes(n.index)).length === selected.length &&
            isSequential(selected.sort((a, b) => a - b))
        );
    }, [tracks, selected]);
    const selectedCount = selected.length;

    if (vintageMode) {
        const p = {
            disc,
            deviceName,

            selected,
            setSelected,
            selectedCount,

            tracks,
            uploadedFiles,
            setUploadedFiles,

            onDrop,
            getRootProps,
            getInputProps,
            isDragActive,
            open,

            moveMenuAnchorEl,
            setMoveMenuAnchorEl,

            handleShowMoveMenu,
            handleCloseMoveMenu,
            handleMoveSelectedTrack,
            handleShowDumpDialog,
            handleDeleteSelected,
            handleRenameActionClick,
            handleRenameTrack,
            handleSelectAllClick,
            handleSelectTrackClick,
        };
        return <W95Main {...p} />;
    }

    return (
        <React.Fragment>
            <Box className={classes.headBox}>
                <Typography component="h1" variant="h4">
                    {deviceName || `Loading...`}
                </Typography>
                <TopMenu />
            </Box>
            <Typography component="h2" variant="body2">
                {disc !== null ? (
                    <React.Fragment>
                        <span>{`${formatTimeFromFrames(disc.left, false)} left of ${formatTimeFromFrames(disc.total, false)} `}</span>
                        <Tooltip
                            title={
                                <React.Fragment>
                                    <span>{`${formatTimeFromFrames(disc.left * 2, false)} left in LP2 Mode`}</span>
                                    <br />
                                    <span>{`${formatTimeFromFrames(disc.left * 4, false)} left in LP4 Mode`}</span>
                                </React.Fragment>
                            }
                            arrow
                        >
                            <span className={classes.remainingTimeTooltip}>SP Mode</span>
                        </Tooltip>
                    </React.Fragment>
                ) : (
                    `Loading...`
                )}
            </Typography>
            <Toolbar
                className={clsx(classes.toolbar, {
                    [classes.toolbarHighlight]: selectedCount > 0,
                })}
            >
                {selectedCount > 0 ? (
                    <Checkbox
                        indeterminate={selectedCount > 0 && selectedCount < tracks.length}
                        checked={selectedCount > 0}
                        onChange={handleSelectAllClick}
                        inputProps={{ 'aria-label': 'select all tracks' }}
                    />
                ) : null}
                {selectedCount > 0 ? (
                    <Typography className={classes.toolbarLabel} color="inherit" variant="subtitle1">
                        {selectedCount} selected
                    </Typography>
                ) : (
                    <Typography component="h3" variant="h6" className={classes.toolbarLabel}>
                        {disc?.fullWidthTitle && `${disc.fullWidthTitle} / `}
                        {disc?.title || `Untitled Disc`}
                    </Typography>
                )}
                {selectedCount > 0 ? (
                    <React.Fragment>
                        <Tooltip title="Record from MD">
                            <Button aria-label="Record" onClick={handleShowDumpDialog}>
                                Record
                            </Button>
                        </Tooltip>
                    </React.Fragment>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title="Delete">
                        <IconButton aria-label="delete" onClick={handleDeleteSelected}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title={canGroup ? 'Group' : ''}>
                        <IconButton aria-label="group" disabled={!canGroup} onClick={handleGroupTracks}>
                            <CreateNewFolderIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title="Rename">
                        <IconButton aria-label="rename" disabled={selectedCount !== 1} onClick={handleRenameActionClick}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Toolbar>
            <Box className={classes.main} {...getRootProps()} id="main">
                <input {...getInputProps()} />
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell className={classes.dragHandleEmpty}></TableCell>
                            <TableCell className={classes.indexCell}>#</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell align="right">Duration</TableCell>
                        </TableRow>
                    </TableHead>
                    <DragDropContext onDragEnd={handleDrop}>
                        <TableBody>
                            {groupedTracks.map((group, index) => (
                                <TableRow key={`${index}`}>
                                    <TableCell colSpan={4} style={{ padding: '0' }}>
                                        <Table size="small">
                                            <Droppable droppableId={`${index}`} key={`${index}`}>
                                                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                    <TableBody
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className={clsx({ [classes.hoveringOverGroup]: snapshot.isDraggingOver })}
                                                    >
                                                        {group.title !== null && (
                                                            <GroupRow
                                                                group={group}
                                                                onRename={handleRenameGroup}
                                                                onDelete={handleDeleteGroup}
                                                            />
                                                        )}
                                                        {group.title === null && group.tracks.length === 0 && (
                                                            <TableRow style={{ height: '1px' }} />
                                                        )}
                                                        {group.tracks.map((t, tidx) => (
                                                            <Draggable
                                                                draggableId={`${group.index}-${t.index}`}
                                                                key={`t-${t.index}`}
                                                                index={tidx}
                                                            >
                                                                {(provided: DraggableProvided) => (
                                                                    <TrackRow
                                                                        track={t}
                                                                        draggableProvided={provided}
                                                                        inGroup={group.title !== null}
                                                                        isSelected={selected.includes(t.index)}
                                                                        trackStatus={getTrackStatus(t, deviceStatus)}
                                                                        onSelect={handleSelectTrackClick}
                                                                        onRename={handleRenameTrack}
                                                                        onTogglePlayPause={handleTogglePlayPauseTrack}
                                                                    />
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </TableBody>
                                                )}
                                            </Droppable>
                                        </Table>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </DragDropContext>
                </Table>
                {isDragActive ? (
                    <Backdrop className={classes.backdrop} open={isDragActive}>
                        Drop your Music to Upload
                    </Backdrop>
                ) : null}
            </Box>
            <Fab color="primary" aria-label="add" className={classes.add} onClick={open}>
                <AddIcon />
            </Fab>

            <UploadDialog />
            <RenameDialog />
            <ErrorDialog />
            <ConvertDialog files={uploadedFiles} />
            <RecordDialog />
            <DumpDialog trackIndexes={selected} />
            <AboutDialog />
            <PanicDialog />
        </React.Fragment>
    );
};
