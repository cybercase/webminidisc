import React from 'react';
import { Button, WindowHeader, Fieldset, Select } from 'react95';
import { Controls } from '../controls';
import { DialogOverlay, DialogWindow, DialogFooter, DialogWindowContent, WindowCloseIcon, FooterButton } from './common';

export const W95DumpDialog = (props: {
    handleClose: () => void;
    handleChange: (
        ev: React.ChangeEvent<{
            value: unknown;
        }>
    ) => void;
    handleStartTransfer: () => void;
    visible: boolean;
    devices: {
        deviceId: string;
        label: string;
    }[];
    inputDeviceId: string;
}) => {
    if (!props.visible) {
        return null;
    }

    return (
        <DialogOverlay>
            <DialogWindow>
                <WindowHeader style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: '1 1 auto' }}>Record Selected Tracks</span>
                    <Button onClick={props.handleClose}>
                        <WindowCloseIcon />
                    </Button>
                </WindowHeader>
                <DialogWindowContent>
                    <div style={{ width: '100%', display: 'flex', alignItems: 'flex-Start', flexDirection: 'column' }}>
                        <p>1. Connect your MD Player line-out to your PC audio line-in.</p>
                        <p>2. Use the controls at the bottom right to play some tracks.</p>
                        <p>3. Select the input source. You should hear the tracks playing on your PC.</p>
                        <p>4. Adjust the input gain and the line-out volume of your device.</p>
                        <Fieldset label="Input Source" style={{ display: 'flex', flex: '1 1 auto', margin: '32px 0' }}>
                            <Select
                                defaultValue={props.inputDeviceId || ''}
                                options={props.devices
                                    .concat([{ deviceId: '', label: 'None' }])
                                    .map(({ deviceId, label }) => ({ value: deviceId, label }))}
                                onChange={props.handleChange}
                                width={200}
                            />
                        </Fieldset>
                        <Controls />
                    </div>
                    <DialogFooter>
                        <div style={{ flex: '1 1 auto' }}></div>
                        <FooterButton onClick={props.handleClose}>Cancel</FooterButton>
                        <FooterButton onClick={props.handleStartTransfer} disabled={props.inputDeviceId === ''}>
                            Start Record
                        </FooterButton>
                    </DialogFooter>
                </DialogWindowContent>
            </DialogWindow>
        </DialogOverlay>
    );
};
