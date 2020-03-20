import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface ErrorDialogState {
    visible: boolean;
    error: string;
}

const initialState: ErrorDialogState = {
    visible: false,
    error: ``,
};

const slice = createSlice({
    name: 'errorDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setErrorMessage: (state, action: PayloadAction<string>) => {
            state.error = `${action.payload}`;
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
