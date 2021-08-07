import React, { useCallback, useContext } from 'react';
import { Button, WindowHeader, Fieldset, Select, Table, TableBody, TableDataCell, Divider, Toolbar } from 'react95';
import { DialogOverlay, DialogWindow, DialogFooter, DialogWindowContent, WindowCloseIcon, FooterButton, CustomTableRow } from './common';
import { TitleFormatType, UploadFormat } from '../../redux/convert-dialog-feature';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { ThemeContext } from 'styled-components';
import ArrowUpIconUrl from '../../images/win95/arrowup.png';
import ArrowDownIconUrl from '../../images/win95/arrowdown.png';
import DeleteIconUrl from '../../images/win95/delete.png';

const trackTitleOptions = [
    { value: 'filename', label: 'Filename' },
    { value: 'title', label: 'Title' },
    { value: 'album-title', label: 'Album - Title' },
    { value: 'artist-title', label: 'Artist - Title' },
    { value: 'title-artist', label: 'Title - Artist' },
    { value: 'artist-album-title', label: 'Artist - Album - Title' },
];

const recordModeOptions = [
    { value: 'SP', label: 'SP' },
    { value: 'LP2', label: 'LP2' },
    { value: 'LP4', label: 'LP4' },
];

export const W95ConvertDialog = (props: {
    visible: boolean;
    format: UploadFormat;
    titleFormat: TitleFormatType;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    selectedTrackIndex: number;
    setSelectedTrack: React.Dispatch<React.SetStateAction<number>>;
    moveFileUp: () => void;
    moveFileDown: () => void;
    handleClose: () => void;
    handleChangeFormat: (ev: any, newFormat: any) => void;
    handleChangeTitleFormat: (
        event: React.ChangeEvent<{
            value: any;
        }>
    ) => void;
    handleConvert: () => void;
    tracksOrderVisible: boolean;
    setTracksOrderVisible: React.Dispatch<React.SetStateAction<boolean>>;
    handleToggleTracksOrder: () => void;
    selectedTrackRef: React.MutableRefObject<HTMLDivElement | null>;
    getRootProps: (props?: DropzoneRootProps | undefined) => DropzoneRootProps;
    getInputProps: (props?: DropzoneInputProps | undefined) => DropzoneInputProps;
    isDragActive: boolean;
    open: () => void;
    disableRemove: boolean;
    handleRemoveSelectedTrack: () => void;
    dialogVisible: boolean;
}) => {
    const themeContext = useContext(ThemeContext);

    const renderTracks = useCallback(() => {
        return props.files.map((file, i) => {
            const isSelected = props.selectedTrackIndex === i;
            const ref = isSelected ? props.selectedTrackRef : null;
            return (
                <CustomTableRow
                    key={`${i}`}
                    onClick={() => props.setSelectedTrack(i)}
                    ref={ref}
                    style={isSelected ? themeContext.selectedTableRow : {}}
                >
                    <TableDataCell>{file.name}</TableDataCell>
                </CustomTableRow>
            );
        });
    }, [props, themeContext]);

    if (!props.dialogVisible) {
        return null;
    }

    return (
        <DialogOverlay>
            <DialogWindow>
                <WindowHeader style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: '1 1 auto' }}>Upload Settings</span>
                    <Button onClick={props.handleClose}>
                        <WindowCloseIcon />
                    </Button>
                </WindowHeader>
                <DialogWindowContent>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <Fieldset label="Recording Mode" style={{ display: 'flex', flex: '1 1 auto' }}>
                            <Select
                                defaultValue={props.format}
                                options={recordModeOptions}
                                width={90}
                                onChange={(ev: any, format: any) => props.handleChangeFormat(ev, format.value)}
                            />
                        </Fieldset>
                        <Fieldset label="Track title" style={{ flex: '1 1 auto', marginLeft: 16 }}>
                            <Select
                                defaultValue={props.titleFormat}
                                options={trackTitleOptions}
                                width={180}
                                onChange={props.handleChangeTitleFormat}
                            />
                        </Fieldset>
                    </div>
                    {props.tracksOrderVisible ? (
                        <div {...props.getRootProps()} style={{ width: '100%', marginTop: 16 }}>
                            <Divider style={{ marginTop: 16 }} />
                            <Toolbar style={{ display: 'flex' }}>
                                <Button variant="menu" onClick={props.open}>
                                    Add...
                                </Button>
                                <Button variant="menu" disabled={props.disableRemove} onClick={props.handleRemoveSelectedTrack}>
                                    <img alt="delete" src={DeleteIconUrl} style={{ marginRight: 4 }} />
                                    Remove
                                </Button>
                                <div style={{ flex: '1 1 auto' }}></div>
                                <Button variant="menu" disabled={props.disableRemove} onClick={props.moveFileDown}>
                                    <img alt="Move Down" src={ArrowDownIconUrl} />
                                </Button>
                                <Button variant="menu" disabled={props.disableRemove} onClick={props.moveFileUp}>
                                    <img alt="Move Up" src={ArrowUpIconUrl} />
                                </Button>
                            </Toolbar>
                            <div style={{ maxHeight: '30vh', overflow: 'scroll' }}>
                                <Table>
                                    <TableBody>{renderTracks()}</TableBody>
                                </Table>
                            </div>
                            <input {...props.getInputProps()} />
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button onClick={props.handleToggleTracksOrder}>{`${props.tracksOrderVisible ? 'Hide' : 'Show'} Tracks`}</Button>
                        <div style={{ flex: '1 1 auto' }}></div>
                        <FooterButton onClick={props.handleConvert}>OK</FooterButton>
                        <FooterButton onClick={props.handleClose}>Cancel</FooterButton>
                    </DialogFooter>
                </DialogWindowContent>
            </DialogWindow>
        </DialogOverlay>
    );
};
