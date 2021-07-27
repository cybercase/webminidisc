import React, { useCallback } from 'react';
import clsx from 'clsx';

import { EncodingName } from '../utils';

import { formatTimeFromFrames, Track, Group } from 'netmd-js';

import { makeStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import * as BadgeImpl from '@material-ui/core/Badge/Badge';

import DragIndicator from '@material-ui/icons/DragIndicator';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import IconButton from '@material-ui/core/IconButton';
import FolderIcon from '@material-ui/icons/Folder';
import DeleteIcon from '@material-ui/icons/Delete';

import { DraggableProvided } from 'react-beautiful-dnd';

const useStyles = makeStyles(theme => ({
    currentTrackRow: {
        color: theme.palette.primary.main,
        '& > td': {
            color: 'inherit',
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
    playButtonInTrackList: {
        display: 'none',
    },
    trackRow: {
        '&:hover': {
            '& $playButtonInTrackList': {
                display: 'inline-flex',
            },
            '& $trackIndex': {
                display: 'none',
            },
        },
    },
    controlButtonInTrackCommon: {
        width: theme.spacing(2),
        height: theme.spacing(2),
        verticalAlign: 'middle',
        marginLeft: theme.spacing(-0.5),
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
    durationCell: {
        whiteSpace: 'nowrap',
    },
    durationCellSecondary: {
        whiteSpace: 'nowrap',
        color: theme.palette.text.secondary,
    },
    durationCellTime: {
        verticalAlign: 'middle',
    },
    titleCell: {
        overflow: 'hidden',
        maxWidth: '40ch',
        textOverflow: 'ellipsis',
        // whiteSpace: 'nowrap',
    },
    deleteGroupButton: {
        display: 'none',
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    trackIndex: {
        display: 'inline-block',
        height: '16px',
        width: '16px',
    },
    dragHandle: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
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
}));

interface TrackRowProps {
    track: Track;
    inGroup: boolean;
    isSelected: boolean;
    isCurrentTrack: boolean;
    draggableProvided: DraggableProvided;
    onSelect: (event: React.MouseEvent, trackIdx: number) => void;
    onRename: (event: React.MouseEvent, trackIdx: number) => void;
    onPlay: (event: React.MouseEvent, trackIdx: number) => void;
}

export function TrackRow({ track, inGroup, isSelected, draggableProvided, isCurrentTrack, onSelect, onRename, onPlay }: TrackRowProps) {
    const classes = useStyles();

    const handleRename = useCallback(event => onRename(event, track.index), [track.index, onRename]);
    const handleSelect = useCallback(event => onSelect(event, track.index), [track.index, onSelect]);
    const handlePlay = useCallback(
        event => {
            onPlay(event, track.index);
            event?.stopPropagation();
        },
        [track.index, onPlay]
    );

    return (
        <TableRow
            {...draggableProvided.draggableProps}
            ref={draggableProvided.innerRef}
            hover
            selected={isSelected}
            onDoubleClick={handleRename}
            onClick={handleSelect}
            color="inherit"
            className={clsx(classes.trackRow, { [classes.inGroupTrackRow]: inGroup, [classes.currentTrackRow]: isCurrentTrack })}
        >
            <TableCell className={classes.dragHandle} {...draggableProvided.dragHandleProps} onClick={event => event.stopPropagation()}>
                <DragIndicator fontSize="small" color="disabled" />
            </TableCell>
            <TableCell className={classes.indexCell}>
                <span className={classes.trackIndex}>{track.index + 1}</span>
                <IconButton
                    aria-label="delete"
                    className={clsx(classes.controlButtonInTrackCommon, classes.playButtonInTrackList)}
                    size="small"
                    onClick={handlePlay}
                >
                    <PlayArrowIcon fontSize="inherit" />
                </IconButton>
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
}

interface GroupRowProps {
    group: Group;
    onRename: (event: React.MouseEvent, groupIdx: number) => void;
    onDelete: (event: React.MouseEvent, groupIdx: number) => void;
}

export function GroupRow({ group, onRename, onDelete }: GroupRowProps) {
    const classes = useStyles();

    const handleDelete = useCallback((event: React.MouseEvent) => onDelete(event, group.index), [onDelete, group]);
    const handleRename = useCallback((event: React.MouseEvent) => onRename(event, group.index), [onRename, group]);
    return (
        <TableRow hover className={classes.groupHeadRow} onDoubleClick={handleRename}>
            <TableCell className={classes.dragHandleEmpty}></TableCell>
            <TableCell className={classes.indexCell}>
                <FolderIcon className={classes.controlButtonInTrackCommon} />
                <DeleteIcon className={clsx(classes.controlButtonInTrackCommon, classes.deleteGroupButton)} onClick={handleDelete} />
            </TableCell>
            <TableCell className={classes.titleCell} title={group.title!}>
                {group.fullWidthTitle ? `${group.fullWidthTitle} / ` : ``}
                {group.title || `No Name`}
            </TableCell>
            <TableCell align="right" className={classes.durationCellSecondary}>
                <span className={classes.durationCellTime}>
                    {formatTimeFromFrames(
                        group.tracks.map(n => n.duration).reduce((a, b) => a + b),
                        false
                    )}
                </span>
            </TableCell>
        </TableRow>
    );
}
