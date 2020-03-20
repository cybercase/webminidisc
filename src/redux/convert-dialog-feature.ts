import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface ConvertDialogFeature {
    visible: boolean;
    format: string;
}

const initialState: ConvertDialogFeature = {
    visible: false,
    format: `LP2`,
};

const slice = createSlice({
    name: 'convertDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setFormat: (state, action: PayloadAction<string>) => {
            state.format = action.payload;
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
