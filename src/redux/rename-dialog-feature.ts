import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface RenameDialogState {
    visible: boolean;
    title: string;
    index: number;
}

const initialState: RenameDialogState = {
    visible: false,
    title: '',
    index: -1,
};

export const slice = createSlice({
    name: 'renameDialog',
    initialState,
    reducers: {
        setVisible: (state: RenameDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setCurrentName: (state: RenameDialogState, action: PayloadAction<string>) => {
            state.title = action.payload;
        },
        setIndex: (state: RenameDialogState, action: PayloadAction<number>) => {
            state.index = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
