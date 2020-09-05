import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export const initialState = {
    visible: false,
    dismissed: false, // This will prevent showing the dialog during the same session
};

const slice = createSlice({
    name: 'panicDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        dismiss: (state, action: PayloadAction<void>) => {
            state.visible = false;
            state.dismissed = true;
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
