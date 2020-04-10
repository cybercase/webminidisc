import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface RecordingDialogState {
    visible: boolean;

    trackTotal: number;
    trackDone: number;
    trackCurrent: number;

    titleCurrent: string;
}

const initialState: RecordingDialogState = {
    visible: false,

    trackTotal: 1,
    trackDone: 0,
    trackCurrent: 0,

    titleCurrent: '',

    // visible: true,
    // trackTotal: 4,
    // trackDone: 1,
    // trackCurrent: 25,

    // titleCurrent: 'Seconda traccia',
};

export const slice = createSlice({
    name: 'recordDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setProgress: (
            state,
            action: PayloadAction<{ trackTotal: number; trackDone: number; trackCurrent: number; titleCurrent: string }>
        ) => {
            state.trackTotal = action.payload.trackTotal;
            state.trackDone = action.payload.trackDone;
            state.trackCurrent = action.payload.trackCurrent;
            state.titleCurrent = action.payload.titleCurrent;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
