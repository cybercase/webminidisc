import React, { useContext } from 'react';
import {
    Table,
    TableHead,
    TableRow,
    TableHeadCell,
    TableBody,
    TableDataCell,
    Divider,
    Toolbar,
    Bar,
    Button,
    WindowContent,
    Tooltip,
    List,
    ListItem,
} from 'react95';
import { Disc, formatTimeFromFrames } from 'netmd-js';
import { makeStyles } from '@material-ui/core/styles';
import { DropzoneRootProps, DropzoneInputProps } from 'react-dropzone';
import { ThemeContext } from 'styled-components';
import { Controls } from '../controls';
import { useShallowEqualSelector } from '../../utils';

import DeleteIconUrl from '../../images/win95/delete.png';
import MicIconUrl from '../../images/win95/mic.png';
import MoveIconUrl from '../../images/win95/move.png';
import RenameIconUrl from '../../images/win95/rename.png';
import DeviceIconUrl from '../../images/win95/device.png';
import { RenameDialog } from '../rename-dialog';
import { AboutDialog } from '../about-dialog';

import MDIconUrl from '../../images/win95/minidisc32.png';
import { FloatingButton, CustomTableRow } from './common';
import { ConvertDialog } from '../convert-dialog';
import { UploadDialog } from '../upload-dialog';
import { ErrorDialog } from '../error-dialog';
import { RecordDialog } from '../record-dialog';
import { DumpDialog } from '../dump-dialog';
import { PanicDialog } from '../panic-dialog';

const useStyles = makeStyles((theme: any) => ({
    container: {
        width: '100%',
        flex: '1 1 auto',
        display: 'flex',
        minHeight: 0,
        '& > div': {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
        },
    },
    table: {
        height: '100%',
        width: '100%',
        display: 'flex !important',
        flexDirection: 'column',
    },
    windowContent: {
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 0,
    },
    controlsContainer: {
        width: '100%',
        marginTop: 16,
    },
    toolbarIcon: {
        marginRight: 4,
    },
    toolbarItem: {
        padding: '6px 10px',
    },
}));

export const W95Main = (props: {
    disc: Disc | null;
    deviceName: string;
    selected: number[];
    setSelected: React.Dispatch<React.SetStateAction<number[]>>;
    selectedCount: number;
    tracks: {
        index: number;
        title: string;
        group: string;
        duration: string;
        encoding: string;
    }[];
    uploadedFiles: File[];
    setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
    onDrop: (acceptedFiles: File[], rejectedFiles: File[]) => void;
    getRootProps: (props?: DropzoneRootProps | undefined) => DropzoneRootProps;
    getInputProps: (props?: DropzoneInputProps | undefined) => DropzoneInputProps;
    isDragActive: boolean;
    open: () => void;
    moveMenuAnchorEl: HTMLElement | null;
    setMoveMenuAnchorEl: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
    handleShowMoveMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
    handleCloseMoveMenu: () => void;
    handleMoveSelectedTrack: (destIndex: number) => void;
    handleShowDumpDialog: () => void;
    handleDeleteSelected: (event: React.MouseEvent) => void;
    handleRenameActionClick: (event: React.MouseEvent) => void;
    handleRenameDoubleClick: (event: React.MouseEvent, item: number) => void;
    handleSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleSelectClick: (event: React.MouseEvent, item: number) => void;
}) => {
    const classes = useStyles();
    const themeContext = useContext(ThemeContext);
    const { mainView } = useShallowEqualSelector(state => state.appState);

    return (
        <>
            <Divider />
            <Toolbar style={{ flexWrap: 'wrap', position: 'relative' }}>
                {props.selectedCount === 0 ? (
                    <>
                        <img alt="device" src={DeviceIconUrl} style={{ marginTop: -10, marginLeft: 10 }} />
                        <div className={classes.toolbarItem}>
                            {`${props.deviceName}: (` || `Loading...`}
                            {props.disc?.title || `Untitled Disc`}
                            {`)`}
                        </div>
                        <Bar size={35} />
                        <img alt="minidisc" src={MDIconUrl} style={{ width: 32, marginLeft: 10 }} />
                        {props.disc !== null ? (
                            <Tooltip
                                text={`${formatTimeFromFrames(props.disc.left * 2, false)} in LP2 or ${formatTimeFromFrames(
                                    props.disc.left * 4,
                                    false
                                )} in LP4`}
                                enterDelay={100}
                                leaveDelay={500}
                            >
                                <div className={classes.toolbarItem}>{`${formatTimeFromFrames(
                                    props.disc.left,
                                    false
                                )} left of ${formatTimeFromFrames(props.disc.total, false)} `}</div>
                            </Tooltip>
                        ) : null}
                    </>
                ) : null}

                {props.selectedCount > 0 ? (
                    <>
                        <Button variant="menu" disabled={props.selectedCount !== 1} onClick={props.handleShowMoveMenu}>
                            <img alt="move" src={MoveIconUrl} className={classes.toolbarIcon} />
                            Move
                        </Button>
                        <Button variant="menu" onClick={props.handleShowDumpDialog}>
                            <img alt="record" src={MicIconUrl} className={classes.toolbarIcon} />
                            Record
                        </Button>
                        <Button variant="menu" onClick={props.handleDeleteSelected}>
                            <img alt="delete" src={DeleteIconUrl} className={classes.toolbarIcon} />
                            Delete
                        </Button>
                        <Button variant="menu" onClick={props.handleRenameActionClick} disabled={props.selectedCount > 1}>
                            <img alt="rename" src={RenameIconUrl} className={classes.toolbarIcon} />
                            Rename
                        </Button>
                        {!!props.moveMenuAnchorEl ? (
                            <List style={{ position: 'absolute', left: 16, top: 32, zIndex: 2 }}>
                                {Array(props.tracks.length)
                                    .fill(null)
                                    .map((_, i) => {
                                        return (
                                            <ListItem key={`pos-${i}`} onClick={() => props.handleMoveSelectedTrack(i)}>
                                                {i + 1}
                                            </ListItem>
                                        );
                                    })}
                            </List>
                        ) : null}
                    </>
                ) : null}
                <Bar size={35} />
            </Toolbar>
            <Divider />
            <WindowContent className={classes.windowContent}>
                <div className={classes.container} {...props.getRootProps()} style={{ outline: 'none' }}>
                    <input {...props.getInputProps()} />
                    <Table className={classes.table}>
                        <TableHead>
                            <TableRow head style={{ display: 'flex' }}>
                                <TableHeadCell style={{ width: '2ch' }}>#</TableHeadCell>
                                <TableHeadCell style={{ textAlign: 'left', flex: '1 1 auto' }}>Title</TableHeadCell>
                                <TableHeadCell style={{ textAlign: 'right', width: '20%' }}>Duration</TableHeadCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {props.tracks.map(track => (
                                <CustomTableRow
                                    style={props.selected.includes(track.index) ? themeContext.selectedTableRow : {}}
                                    key={track.index}
                                    onDoubleClick={(event: React.MouseEvent) => props.handleRenameDoubleClick(event, track.index)}
                                    onClick={(event: React.MouseEvent) => props.handleSelectClick(event, track.index)}
                                >
                                    <TableDataCell style={{ textAlign: 'center', width: '2ch' }}>{track.index + 1}</TableDataCell>
                                    <TableDataCell style={{ width: '80%' }}>
                                        <div>{track.title || `No Title`}</div>
                                    </TableDataCell>
                                    <TableDataCell style={{ textAlign: 'right', width: '20%' }}>
                                        <span>{track.encoding}</span>
                                        &nbsp;
                                        <span>{track.duration}</span>
                                    </TableDataCell>
                                </CustomTableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className={classes.controlsContainer}>{mainView === 'MAIN' ? <Controls /> : null}</div>
            </WindowContent>
            <FloatingButton onClick={props.open} />

            <UploadDialog />
            <RenameDialog />
            <ErrorDialog />
            <ConvertDialog files={props.uploadedFiles} />
            <RecordDialog />
            <DumpDialog trackIndexes={props.selected} />
            <AboutDialog />
            <PanicDialog />
        </>
    );
};
