import React, { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';
import { listContent, deleteTracks } from '../redux/actions';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';

import { formatTimeFromFrames, getTracks, Encoding } from 'netmd-js';

import { useShallowEqualSelector } from '../utils';

import { lighten, makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Backdrop from '@material-ui/core/Backdrop';

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
import { ErrorDialog } from './error-dialog';
import { ConvertDialog } from './convert-dialog';
import { AboutDialog } from './about-dialog';
import { TopMenu } from './topmenu';
import Checkbox from '@material-ui/core/Checkbox';
import * as BadgeImpl from '@material-ui/core/Badge/Badge';

const useStyles = makeStyles(theme => ({
    add: {
        position: 'absolute',
        bottom: theme.spacing(3),
        right: theme.spacing(3),
    },
    main: {
        overflowY: 'auto',
        flex: '1 1 auto',
        marginBottom: theme.spacing(3),
        marginLeft: theme.spacing(-2),
        marginRight: theme.spacing(-2),
        outline: 'none',
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
    },
    titleCell: {
        overflow: 'hidden',
        maxWidth: '40ch',
        textOverflow: 'ellipsis',
        // whiteSpace: 'nowrap',
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}));

const EncodingName: { [k: number]: string } = {
    [Encoding.sp]: 'SP',
    [Encoding.lp2]: 'LP2',
    [Encoding.lp4]: 'LP4',
};

export const Main = (props: {}) => {
    let dispatch = useDispatch();
    let disc = useShallowEqualSelector(state => state.main.disc);
    let deviceName = useShallowEqualSelector(state => state.main.deviceName);

    const [selected, setSelected] = React.useState<number[]>([]);
    const selectedCount = selected.length;

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
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, accept: `audio/*`, noClick: true });

    const classes = useStyles();

    let tracks: { index: number; title: string; group: string; duration: string; encoding: string }[] = [];
    if (disc !== null) {
        for (let group of disc.groups) {
            for (let track of group.tracks) {
                tracks.push({
                    index: track.index,
                    title: track.title ?? `Unknown Title`,
                    group: group.title ?? ``,
                    encoding: EncodingName[track.encoding],
                    duration: formatTimeFromFrames(track.duration, false),
                });
            }
        }
    }

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
        let currentName = getTracks(disc!).find(track => track.index === selectedIndex)?.title ?? '';

        dispatch(
            batchActions([
                renameDialogActions.setVisible(true),
                renameDialogActions.setCurrentName(currentName),
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

    return (
        <React.Fragment>
            <Box className={classes.headBox}>
                <Typography component="h1" variant="h4">
                    {deviceName || `Loading...`}
                </Typography>
                <TopMenu />
            </Box>
            <Typography component="h2" variant="body2">
                {disc !== null
                    ? `${formatTimeFromFrames(disc.left, false)} left of ${formatTimeFromFrames(disc.total, false)}`
                    : `Loading...`}
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
                        {disc?.title || `Untitled Disc`}
                    </Typography>
                )}

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
                            <TableCell>Title</TableCell>
                            <TableCell>Format</TableCell>
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
                            >
                                <TableCell className={classes.titleCell} title={track.title}>
                                    {track.title || `No Title`}
                                </TableCell>
                                <TableCell>
                                    <span className={classes.formatBadge}>{track.encoding}</span>
                                </TableCell>
                                <TableCell align="right">{track.duration}</TableCell>
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
            <AboutDialog />
        </React.Fragment>
    );
};
