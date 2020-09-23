import { Disc, DeviceStatus } from 'netmd-js';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface MainState {
    disc: Disc | null;
    deviceName: string;
    deviceStatus: DeviceStatus | null;
}

const initialState: MainState = {
    disc: null,
    deviceName: '',
    deviceStatus: null,
};

export const slice = createSlice({
    name: 'main',
    initialState,
    reducers: {
        setDisc: (state, action: PayloadAction<Disc>) => {
            state.disc = action.payload;
        },
        setDeviceName: (state, action: PayloadAction<string>) => {
            state.deviceName = action.payload;
        },
        setDeviceStatus: (state, action: PayloadAction<DeviceStatus>) => {
            state.deviceStatus = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
