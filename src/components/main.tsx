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

import { formatTimeFromFrames, Track } from 'netmd-js';
import { control } from '../redux/actions';

import {
    belowDesktop,
    forAnyDesktop,
    getGroupedTracks,
    getSortedTracks,
    isSequential,
    useShallowEqualSelector,
    EncodingName,
} from '../utils';

import { lighten, makeStyles } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Backdrop from '@material-ui/core/Backdrop';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import FolderIcon from '@material-ui/icons/Folder';
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
import * as BadgeImpl from '@material-ui/core/Badge/Badge';
import Button from '@material-ui/core/Button';
import { W95Main } from './win95/main';

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
    formatBadge: {
        ...(BadgeImpl as any).styles(theme).badge,
        ...(BadgeImpl as any).styles(theme).colorPrimary,
        position: 'static',
        display: 'inline-flex',
        border: `2px solid ${theme.palette.background.paper}`,
        padding: '0 4px',
        verticalAlign: 'middle',
        width: theme.spacing(4.5),
        marginRight: theme.spacing(0.5),
    },
    titleCell: {
        overflow: 'hidden',
        maxWidth: '40ch',
        textOverflow: 'ellipsis',
        // whiteSpace: 'nowrap',
    },
    durationCell: {
        whiteSpace: 'nowrap',
    },
    durationCellTime: {
        verticalAlign: 'middle',
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: `16px`,
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    remainingTimeTooltip: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
    },
    controlButtonInTrackCommon: {
        width: `16px`,
        height: `16px`,
        verticalAlign: 'middle',
        cursor: 'pointer',
        marginLeft: theme.spacing(-0.5),
    },
    playButtonInTrackListPlaying: {
        color: theme.palette.primary.main,
        display: 'none',
    },
    pauseButtonInTrackListPlaying: {
        color: theme.palette.primary.main,
        display: 'none',
    },
    currentControlButton: {
        display: 'inline-block',
    },
    playButtonInTrackListNotPlaying: {
        width: `0px`,
    },
    trackRow: {
        userSelect: 'none',
        '&:hover': {
            /* For the tracks that aren't currently playing */
            '& $playButtonInTrackListNotPlaying': {
                width: `16px`,
            },
            '& $trackIndex': {
                width: `0px`,
                display: 'none',
            },

            /* For the current track */
            '& svg:not($currentControlButton)': {
                display: 'inline-block',
            },
            '& $currentControlButton': {
                display: 'none',
            },
        },
    },
    inGroupTrackRow: {
        '& > $indexCell': {
            transform: `translateX(${theme.spacing(3)}px)`,
        },
        '& > $titleCell': {
            transform: `translateX(${theme.spacing(3)}px)`,
        },
    },
    deleteGroupButton: {
        display: 'none',
    },
    groupHeadRow: {
        '&:hover': {
            '& svg:not($deleteGroupButton)': {
                display: 'none',
            },
            '& $deleteGroupButton': {
                display: 'inline-block',
            },
        },
    },
    hoveringOverGroup: {
        backgroundColor: `${fade(theme.palette.secondary.dark, 0.4)}`,
    },
    trackIndex: {
        display: 'inline-block',
        height: '16px',
        width: '16px',
    },
}));

export const Main = (props: {}) => {
    let dispatch = useDispatch();
    let disc = useShallowEqualSelector(state => state.main.disc);
    let deviceName = useShallowEqualSelector(state => state.main.deviceName);
    const deviceStatus = useShallowEqualSelector(state => state.main.deviceStatus);
    const { vintageMode } = useShallowEqualSelector(state => state.appState);

    const [selected, setSelected] = React.useState<number[]>([]);
    const [lastClicked, setLastClicked] = useState(-1);
    const selectedCount = selected.length;

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

    let [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
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
    const tracks = getSortedTracks(disc);
    const groupedTracks = getGroupedTracks(disc);

    // Action Handlers
    const handleSelectClick = (event: React.MouseEvent, item: number) => {
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
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (selected.length < tracks.length) {
            setSelected(tracks.map(t => t.index));
        } else {
            setSelected([]);
        }
    };

    const handleRenameDoubleClick = (event: React.MouseEvent, index: number, renameGroup?: boolean) => {
        let group, track;
        if (renameGroup) {
            group = groupedTracks.find(n => n.tracks[0]?.index === index);
            if (!group) return;
        } else {
            track = tracks.find(n => n.index === index);
            if (!track) return;
        }

        let currentName = (track ? track.title : group?.title) ?? '';
        let currentFullWidthName = (track ? track.fullWidthTitle : group?.fullWidthTitle) ?? '';
        dispatch(
            batchActions([
                renameDialogActions.setVisible(true),
                renameDialogActions.setGroupIndex(group ? index : null),
                renameDialogActions.setCurrentName(currentName),
                renameDialogActions.setCurrentFullWidthName(currentFullWidthName),
                renameDialogActions.setIndex(track?.index ?? -1),
            ])
        );
    };

    const handleRenameActionClick = (event: React.MouseEvent) => {
        if(event.detail !== 1) return; //Event retriggering when hitting enter in the dialog
        handleRenameDoubleClick(event, selected[0]);
    };

    const handleDeleteSelected = (event: React.MouseEvent) => {
        dispatch(deleteTracks(selected));
    };

    const handleGroupTracks = (event: React.MouseEvent) => {
        dispatch(groupTracks(selected));
    };

    const handleGroupRemoval = (event: React.MouseEvent, groupBegin: number) => {
        dispatch(deleteGroup(groupBegin));
    };

    const handlePlayTrack = async (event: React.MouseEvent, track: number) => {
        if (deviceStatus?.track !== track) {
            dispatch(control('goto', track));
        }
        if (deviceStatus?.state !== 'playing') {
            dispatch(control('play'));
        }
    };

    const handleCurrentClick = async (event: React.MouseEvent) => {
        if (deviceStatus?.state === 'playing') {
            dispatch(control('pause'));
        } else dispatch(control('play'));
    };

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
            handleRenameDoubleClick,
            handleSelectAllClick,
            handleSelectClick,
        };
        return <W95Main {...p} />;
    }

    const getTrackRow = (track: Track, inGroup: boolean, additional: {}) => {
        const child = (
            <TableRow
                {...additional}
                hover
                selected={selected.includes(track.index)}
                onDoubleClick={event => handleRenameDoubleClick(event, track.index)}
                onClick={event => handleSelectClick(event, track.index)}
                className={clsx(classes.trackRow, { [classes.inGroupTrackRow]: inGroup })}
            >
                <TableCell className={classes.indexCell}>
                    {track.index === deviceStatus?.track && ['playing', 'paused'].includes(deviceStatus?.state) ? (
                        <span>
                            <PlayArrowIcon
                                className={clsx(classes.controlButtonInTrackCommon, classes.playButtonInTrackListPlaying, {
                                    [classes.currentControlButton]: deviceStatus?.state === 'playing',
                                })}
                                onClick={event => {
                                    handleCurrentClick(event);
                                    event.stopPropagation();
                                }}
                            />
                            <PauseIcon
                                className={clsx(classes.controlButtonInTrackCommon, classes.pauseButtonInTrackListPlaying, {
                                    [classes.currentControlButton]: deviceStatus?.state === 'paused',
                                })}
                                onClick={event => {
                                    handleCurrentClick(event);
                                    event.stopPropagation();
                                }}
                            />
                        </span>
                    ) : (
                        <span>
                            <span className={classes.trackIndex}>{track.index + 1}</span>
                            <PlayArrowIcon
                                className={clsx(classes.controlButtonInTrackCommon, classes.playButtonInTrackListNotPlaying)}
                                onClick={event => {
                                    handlePlayTrack(event, track.index);
                                    event.stopPropagation();
                                }}
                            />
                        </span>
                    )}
                </TableCell>
                <TableCell className={classes.titleCell} title={track.title ?? ''}>
                    {track.fullWidthTitle ? `${track.fullWidthTitle} / ` : ``}
                    {track.title || `No Title`}
                </TableCell>
                <TableCell align="right" className={classes.durationCell}>
                    <span className={classes.formatBadge}>{EncodingName[track.encoding]}</span>
                    <span className={classes.durationCellTime}>{formatTimeFromFrames(track.duration, false)}</span>
                </TableCell>
            </TableRow>
        );
        return child;
    };

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
                    <Tooltip title="Group">
                        <IconButton
                            aria-label="group"
                            disabled={
                                !isSequential(selected.sort((a, b) => a - b)) ||
                                tracks.filter(n => n.group === null && selected.includes(n.index)).length !== selected.length
                            }
                            onClick={handleGroupTracks}
                        >
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
                            <TableCell className={classes.indexCell}>#</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell align="right">Duration</TableCell>
                        </TableRow>
                    </TableHead>
                    <DragDropContext onDragEnd={handleDrop}>
                        <TableBody>
                            {groupedTracks.map((group, index) => (
                                <TableRow key={`${index}`}>
                                    <TableCell colSpan={3} style={{ padding: '0' }}>
                                        <Table size="small">
                                            <Droppable droppableId={`${index}`} key={`${index}`}>
                                                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                    <TableBody
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className={clsx({ [classes.hoveringOverGroup]: snapshot.isDraggingOver })}
                                                    >
                                                        {group.title !== null && (
                                                            <TableRow
                                                                hover
                                                                className={classes.groupHeadRow}
                                                                key={`${index}-head`}
                                                                onDoubleClick={event =>
                                                                    handleRenameDoubleClick(event, group.tracks[0].index, true)
                                                                }
                                                            >
                                                                <TableCell className={classes.indexCell}>
                                                                    <FolderIcon className={classes.controlButtonInTrackCommon} />
                                                                    <DeleteIcon
                                                                        className={clsx(
                                                                            classes.controlButtonInTrackCommon,
                                                                            classes.deleteGroupButton
                                                                        )}
                                                                        onClick={event => {
                                                                            handleGroupRemoval(event, group.tracks[0].index);
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className={classes.titleCell} title={group.title!}>
                                                                    {group.fullWidthTitle ? `${group.fullWidthTitle} / ` : ``}
                                                                    {group.title || `No Name`}
                                                                </TableCell>
                                                                <TableCell align="right" className={classes.durationCell}>
                                                                    <span className={classes.durationCellTime}>
                                                                        {formatTimeFromFrames(
                                                                            group.tracks.map(n => n.duration).reduce((a, b) => a + b),
                                                                            false
                                                                        )}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {group.title === null && group.tracks.length === 0 && (
                                                            <TableRow style={{ height: '1px' }} />
                                                        )}
                                                        {group.tracks.map(n => (
                                                            <Draggable
                                                                draggableId={`${group.index}-${n.index}`}
                                                                key={`${n.index - group.tracks[0].index}`}
                                                                index={n.index - group.tracks[0].index}
                                                            >
                                                                {(providedInGroup: DraggableProvided) =>
                                                                    getTrackRow(n, group.title !== null, {
                                                                        ref: providedInGroup.innerRef,
                                                                        ...providedInGroup.draggableProps,
                                                                        ...providedInGroup.dragHandleProps,
                                                                    })
                                                                }
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
                <Backdrop className={classes.backdrop} open={isDragActive}>
                    Drop your Music to Upload
                </Backdrop>
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
