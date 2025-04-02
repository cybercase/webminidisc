import React, { useCallback, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

import { EncodingName } from '../utils';

import { formatTimeFromFrames, Track, Group } from 'netmd-js';

import { makeStyles, useTheme } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import * as BadgeImpl from '@material-ui/core/Badge/Badge';
import Tooltip from '@material-ui/core/Tooltip';

import DragIndicator from '@material-ui/icons/DragIndicator';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import IconButton from '@material-ui/core/IconButton';
import FolderIcon from '@material-ui/icons/Folder';
import DeleteIcon from '@material-ui/icons/Delete';
import AlbumIcon from '@material-ui/icons/Album';

import { DraggableProvided } from 'react-beautiful-dnd';
import ServiceRegistry from '../services/registry';

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
    titleCellContent: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    titleContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
        flex: 1,
    },
    trackTitle: {
        fontWeight: 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '1.2',
    },
    trackInfo: {
        fontSize: '0.85em',
        color: theme.palette.text.secondary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: '1.2',
        marginTop: theme.spacing(0.5),
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
    groupFolderIcon: {},
    groupHeadRow: {
        '&:hover': {
            '& $deleteGroupButton': {
                display: 'inline-flex',
            },
            '& $groupFolderIcon': {
                display: 'none',
            },
        },
    },
    albumAvatar: {
        width: theme.spacing(4),
        height: theme.spacing(4),
        marginRight: theme.spacing(1),
        fontSize: '0.75rem',
        borderRadius: theme.shape.borderRadius,
        flexShrink: 0,
    },
    albumCover: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: theme.shape.borderRadius,
    },
}));

interface TrackRowProps {
    track: Track;
    inGroup: boolean;
    isSelected: boolean;
    trackStatus: 'playing' | 'paused' | 'none';
    draggableProvided: DraggableProvided;
    onSelect: (event: React.MouseEvent, trackIdx: number) => void;
    onRename: (event: React.MouseEvent, trackIdx: number) => void;
    onTogglePlayPause: (event: React.MouseEvent, trackIdx: number) => void;
}

// Album cover cache (globally managed to persist between component re-renders)
const albumCoverCache = new Map<
    string,
    {
        albumImage: string | null;
        artist: string;
        trackName: string;
        timestamp: number; // Timestamp for cache lifetime management
    }
>();

// Create unique cache key based on track title only (excluding index)
function createCacheKey(track: Track): string {
    // Use only track title to ensure same tracks have same key even if index changes
    return track.title || 'untitled';
}

// Cache management (maintain max 100 items, remove oldest entries)
function manageCache(): void {
    if (albumCoverCache.size > 100) {
        // Sort by oldest timestamp
        const entries = [...albumCoverCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        // Remove 20 oldest entries
        for (let i = 0; i < 20; i++) {
            if (entries[i]) {
                albumCoverCache.delete(entries[i][0]);
            }
        }
    }
}

// Debounce function implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function(...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

// Function to load album cover with low priority
function loadWithLowPriority(callback: () => void): void {
    // Execute during browser's next idle time
    setTimeout(callback, 50);
}

export function TrackRow({
    track,
    inGroup,
    isSelected,
    draggableProvided,
    trackStatus,
    onSelect,
    onRename,
    onTogglePlayPause,
}: TrackRowProps) {
    const classes = useStyles();
    const theme = useTheme();
    const [albumImage, setAlbumImage] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [artist, setArtist] = useState<string>('');
    const [trackName, setTrackName] = useState<string>('');
    const isLoadingRef = useRef(false);
    const trackTitleRef = useRef(track.title || '');
    const prevTrackRef = useRef<Track | null>(null);

    // Check cache and initial load on component mount
    useEffect(() => {
        const cacheKey = createCacheKey(track);
        const cachedInfo = albumCoverCache.get(cacheKey);

        // Check if track changed or is being loaded for the first time
        const isNewTrack = prevTrackRef.current?.title !== track.title;
        prevTrackRef.current = track;

        console.log(
            `[Track ${track.index}] Cache check for "${track.title}":`,
            cachedInfo ? 'Found in cache' : 'Not in cache',
            `(Cache size: ${albumCoverCache.size})`
        );

        if (cachedInfo) {
            // Update state if cache has info
            console.log(
                `[Track ${track.index}] Using cached image for "${track.title}":`,
                cachedInfo.albumImage ? 'Has image' : 'No image'
            );
            setAlbumImage(cachedInfo.albumImage);
            setArtist(cachedInfo.artist);
            setTrackName(cachedInfo.trackName);
            setHasLoaded(true);

            // Update timestamp when cache entry is used
            albumCoverCache.set(cacheKey, {
                ...cachedInfo,
                timestamp: Date.now(),
            });
        } else if (isNewTrack) {
            // Reset states for new track without cache entry
            console.log(`[Track ${track.index}] New track, resetting states for "${track.title}"`);
            setAlbumImage(null);
            setArtist('');
            setTrackName('');
            setHasLoaded(false);
            isLoadingRef.current = false;
            trackTitleRef.current = track.title || '';
        }

        // Manage cache
        manageCache();
    }, [track]);

    // Attempt to extract artist and album info from track name (with debounce and low priority)
    useEffect(() => {
        // Skip if already loaded, loading in progress, or no title
        if (!track.title || hasLoaded || isLoadingRef.current) return;

        isLoadingRef.current = true;
        trackTitleRef.current = track.title || '';

        // Execute with low priority to let other UI tasks take precedence
        loadWithLowPriority(() => {
            // Debounce album cover loading (300ms)
            const debouncedFetchAlbumCover = debounce(async () => {
                // Stop if image already exists or loading completed
                if (albumImage || hasLoaded) {
                    isLoadingRef.current = false;
                    return;
                }

                if (!track.title) return;

                try {
                    const lastFmService = ServiceRegistry.lastFmService;
                    if (!lastFmService) {
                        isLoadingRef.current = false;
                        setHasLoaded(true);
                        return;
                    }

                    // Extract artist and track name
                    let extractedArtist = '';
                    let extractedTrackName = track.title;

                    const dashIndex = track.title.indexOf(' - ');
                    if (dashIndex !== -1) {
                        const parts = [track.title.substring(0, dashIndex).trim(), track.title.substring(dashIndex + 3).trim()];
                        extractedArtist = parts[0];
                        extractedTrackName = parts[1];
                    }

                    // Store current track title to check if track changed during async operation
                    const currentTrackTitle = trackTitleRef.current;

                    // Update state regardless of extraction success
                    if (currentTrackTitle === trackTitleRef.current) {
                        setArtist(extractedArtist);
                        setTrackName(extractedTrackName);
                    }

                    // Search with artist+track if artist name exists
                    let foundImage = false;
                    let imageUrl = null;
                    if (extractedArtist) {
                        try {
                            const result = await lastFmService.getTrackInfo(extractedArtist, extractedTrackName);
                            if (result.album?.images?.small && currentTrackTitle === trackTitleRef.current) {
                                imageUrl = result.album.images.small;
                                setAlbumImage(imageUrl);
                                foundImage = true;
                            }
                        } catch (error) {
                            console.log(`Track info search failed (artist+track): ${extractedArtist} - ${extractedTrackName}`);
                        }

                        // Try artist+album if track search failed
                        if (!foundImage) {
                            try {
                                const albumResult = await lastFmService.getAlbumInfo(extractedArtist, extractedTrackName);
                                if (albumResult.images?.small && currentTrackTitle === trackTitleRef.current) {
                                    imageUrl = albumResult.images.small;
                                    setAlbumImage(imageUrl);
                                    foundImage = true;
                                }
                            } catch (error) {
                                console.log(`Album info search failed (artist+album): ${extractedArtist} - ${extractedTrackName}`);
                            }
                        }
                    }

                    // If image not found yet, search with full track name
                    if (!foundImage) {
                        try {
                            const result = await lastFmService.getTrackInfo('', track.title);
                            if (result.album?.images?.small && currentTrackTitle === trackTitleRef.current) {
                                imageUrl = result.album.images.small;
                                setAlbumImage(imageUrl);
                                foundImage = true;
                            }
                        } catch (error) {
                            console.log(`Track info search failed (full title): ${track.title}`);
                        }
                    }

                    // Last resort: try full title as album name
                    if (!foundImage) {
                        try {
                            const albumResult = await lastFmService.getAlbumInfo('', track.title);
                            if (albumResult.images?.small && currentTrackTitle === trackTitleRef.current) {
                                imageUrl = albumResult.images.small;
                                setAlbumImage(imageUrl);
                                foundImage = true;
                            }
                        } catch (error) {
                            console.log(`Album info search failed (full title): ${track.title}`);
                        }
                    }

                    // Save result to cache (only if image exists)
                    if (currentTrackTitle === trackTitleRef.current && imageUrl) {
                        const cacheKey = createCacheKey(track);
                        albumCoverCache.set(cacheKey, {
                            albumImage: imageUrl,
                            artist: extractedArtist,
                            trackName: extractedTrackName,
                            timestamp: Date.now(),
                        });
                    }

                    // Mark loading as complete
                    setHasLoaded(true);
                } catch (error) {
                    console.error('Failed to fetch album cover:', error);
                } finally {
                    isLoadingRef.current = false;
                }
            }, 300);

            debouncedFetchAlbumCover();
        });

        // Cleanup function
        return () => {
            isLoadingRef.current = false;
        };
    }, [track, hasLoaded, albumImage]);

    const handleRename = useCallback(event => onRename(event, track.index), [track.index, onRename]);
    const handleSelect = useCallback(event => onSelect(event, track.index), [track.index, onSelect]);
    const handlePlayPause: React.MouseEventHandler = useCallback(
        event => {
            event.stopPropagation();
            onTogglePlayPause(event, track.index);
        },
        [track.index, onTogglePlayPause]
    );
    const handleDoubleClickOnPlayButton: React.MouseEventHandler = useCallback(event => event.stopPropagation(), []);
    const isPlayingOrPaused = trackStatus === 'playing' || trackStatus === 'paused';

    return (
        <TableRow
            {...draggableProvided.draggableProps}
            ref={draggableProvided.innerRef}
            hover
            selected={isSelected}
            onDoubleClick={handleRename}
            onClick={handleSelect}
            color="inherit"
            className={clsx(classes.trackRow, { [classes.inGroupTrackRow]: inGroup, [classes.currentTrackRow]: isPlayingOrPaused })}
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
                    onClick={handlePlayPause}
                    onDoubleClick={handleDoubleClickOnPlayButton}
                >
                    {trackStatus === 'paused' || trackStatus === 'none' ? (
                        <PlayArrowIcon fontSize="inherit" />
                    ) : (
                        <PauseIcon fontSize="inherit" />
                    )}
                </IconButton>
            </TableCell>
            <TableCell className={classes.titleCell} title={track.title ?? ''} style={{ width: '100%' }}>
                <div className={classes.titleCellContent}>
                    {albumImage ? (
                        <Tooltip title="Album Cover">
                            <div className={classes.albumAvatar}>
                                <img className={classes.albumCover} src={albumImage} alt="Album" />
                            </div>
                        </Tooltip>
                    ) : (
                        <div
                            className={classes.albumAvatar}
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: theme.palette.grey[300] }}
                        >
                            <AlbumIcon style={{ fontSize: '20px' }} />
                        </div>
                    )}
                    <div className={classes.titleContent}>
                        <div className={classes.trackTitle}>{trackName || track.title || `No Title`}</div>
                        <div className={classes.trackInfo}>
                            {artist && artist}
                            {artist && track.fullWidthTitle && ' / '}
                            {track.fullWidthTitle && track.fullWidthTitle}
                        </div>
                    </div>
                </div>
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
                <FolderIcon className={clsx(classes.controlButtonInTrackCommon, classes.groupFolderIcon)} />
                <IconButton
                    aria-label="delete"
                    className={clsx(classes.controlButtonInTrackCommon, classes.deleteGroupButton)}
                    size="small"
                    onClick={handleDelete}
                >
                    <DeleteIcon fontSize="inherit" />
                </IconButton>
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
