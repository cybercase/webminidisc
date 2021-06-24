import React, { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';
import { listContent, deleteTracks, moveTrack } from '../redux/actions';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { actions as dumpDialogActions } from '../redux/dump-dialog-feature';

import { formatTimeFromFrames, getTracks } from 'netmd-js';
import { control } from '../redux/actions';

import { belowDesktop, forAnyDesktop, getSortedTracks, useShallowEqualSelector } from '../utils';

import { lighten, makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Backdrop from '@material-ui/core/Backdrop';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';

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
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
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
        width: `2ch`,
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
        verticalAlign: 'middle',
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
        visibility: 'hidden',
    },
    trackRow: {
        '&:hover': {
            /* For the tracks that aren't currently playing */
            '& $playButtonInTrackListNotPlaying': {
                visibility: 'visible',
            },
            '& $trackIndex': {
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
    trackIndex: {
        display: 'inline-block',
    },
}));

export const Main = (props: {}) => {
    let dispatch = useDispatch();
    let disc = useShallowEqualSelector(state => state.main.disc);
    let deviceName = useShallowEqualSelector(state => state.main.deviceName);
    const deviceStatus = useShallowEqualSelector(state => state.main.deviceStatus);
    const { vintageMode } = useShallowEqualSelector(state => state.appState);

    const [selected, setSelected] = React.useState<number[]>([]);
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

    // Action Handlers
    const handleSelectClick = (event: React.MouseEvent, item: number) => {
        if (selected.includes(item)) {
            setSelected(selected.filter(i => i !== item));
        } else {
            setSelected([...selected, item]);
        }
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (selected.length < tracks.length) {
            setSelected(tracks.map(t => t.index));
        } else {
            setSelected([]);
        }
    };

    const handleRenameDoubleClick = (event: React.MouseEvent, item: number) => {
        let selectedIndex = item;
        let track = getTracks(disc!).find(track => track.index === selectedIndex);
        let currentName = track?.title ?? '';
        let currentFullWidthName = track?.fullWidthTitle ?? '';

        dispatch(
            batchActions([
                renameDialogActions.setVisible(true),
                renameDialogActions.setCurrentName(currentName),
                renameDialogActions.setCurrentFullWidthName(currentFullWidthName),
                renameDialogActions.setIndex(selectedIndex),
            ])
        );
    };

    const handleRenameActionClick = (event: React.MouseEvent) => {
        handleRenameDoubleClick(event, selected[0]);
    };

    const handleDeleteSelected = (event: React.MouseEvent) => {
        dispatch(deleteTracks(selected));
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
                {selectedCount === 1 ? (
                    <React.Fragment>
                        <Tooltip title="Move to Position">
                            <Button aria-controls="move-menu" aria-label="Move" onClick={handleShowMoveMenu}>
                                Move
                            </Button>
                        </Tooltip>
                        <Menu
                            id="move-menu"
                            anchorEl={moveMenuAnchorEl}
                            open={!!moveMenuAnchorEl}
                            onClose={handleCloseMoveMenu}
                            PaperProps={{
                                style: {
                                    maxHeight: 300,
                                },
                            }}
                        >
                            {Array(tracks.length)
                                .fill(null)
                                .map((_, i) => {
                                    return (
                                        <MenuItem key={`pos-${i}`} onClick={() => handleMoveSelectedTrack(i)}>
                                            {i + 1}
                                        </MenuItem>
                                    );
                                })}
                        </Menu>
                    </React.Fragment>
                ) : null}

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
                    <Tooltip title="Rename">
                        <IconButton aria-label="rename" disabled={selectedCount !== 1} onClick={handleRenameActionClick}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Toolbar>
            <Box className={classes.main} {...getRootProps()}>
                <input {...getInputProps()} />
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell className={classes.indexCell}>#</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell align="right">Duration</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tracks.map(track => (
                            <TableRow
                                hover
                                selected={selected.includes(track.index)}
                                key={track.index}
                                onDoubleClick={event => handleRenameDoubleClick(event, track.index)}
                                onClick={event => handleSelectClick(event, track.index)}
                                className={classes.trackRow}
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
                                                className={clsx(
                                                    classes.controlButtonInTrackCommon,
                                                    classes.playButtonInTrackListNotPlaying
                                                )}
                                                onClick={event => {
                                                    handlePlayTrack(event, track.index);
                                                    event.stopPropagation();
                                                }}
                                            />
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className={classes.titleCell} title={track.title}>
                                    {track.fullWidthTitle ? `${track.fullWidthTitle} / ` : ``}
                                    {track.title || `No Title`}
                                </TableCell>
                                <TableCell align="right" className={classes.durationCell}>
                                    <span className={classes.formatBadge}>{track.encoding}</span>
                                    <span className={classes.durationCellTime}>{track.duration}</span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
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
