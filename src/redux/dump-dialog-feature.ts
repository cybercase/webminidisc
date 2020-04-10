import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface DumpDialogState {
    visible: boolean;
    inputDeviceId: string;
}

const initialState: DumpDialogState = {
    visible: false,
    inputDeviceId: '',
};

export const slice = createSlice({
    name: 'dumpDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setInputDeviceId: (state, action: PayloadAction<string>) => {
            state.inputDeviceId = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
