import React from 'react';
import { WindowHeader, WindowContent, TextField } from 'react95';
import { DialogOverlay, DialogFooter, DialogWindow, FooterButton } from './common';

export const W95RenameDialog = (props: {
    renameDialogVisible: boolean;
    renameDialogTitle: string;
    renameDialogIndex: number;
    what: string;
    handleCancelRename: () => void;
    handleDoRename: () => void;
    handleChange: (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
}) => {
    if (!props.renameDialogVisible) {
        return null;
    }

    return (
        <DialogOverlay>
            <DialogWindow>
                <WindowHeader>
                    <span>Rename {props.what}</span>
                </WindowHeader>
                <WindowContent>
                    <p style={{ marginBottom: 4 }}>{props.what} Name:</p>
                    <TextField
                        style={{ marginBottom: 16 }}
                        value={props.renameDialogTitle}
                        placeholder="Type here..."
                        onChange={props.handleChange}
                        onKeyDown={(event: any) => {
                            event.key === `Enter` && props.handleDoRename();
                        }}
                        fullWidth
                    />
                    <DialogFooter>
                        <FooterButton onClick={props.handleDoRename}>OK</FooterButton>
                        <FooterButton onClick={props.handleCancelRename}>Cancel</FooterButton>
                    </DialogFooter>
                </WindowContent>
            </DialogWindow>
        </DialogOverlay>
    );
};
