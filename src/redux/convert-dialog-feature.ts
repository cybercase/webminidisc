import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { savePreference, loadPreference } from '../utils';

export type TitleSourceType = 'file' | 'media';
export type TitleFormatType = 'title' | 'album-title' | 'artist-title' | 'artist-album-title';

export interface ConvertDialogFeature {
    visible: boolean;
    format: string;
    titleSource: TitleSourceType;
    titleFormat: TitleFormatType;
}

const initialState: ConvertDialogFeature = {
    visible: false,
    format: `LP2`,
    titleSource: loadPreference('trackTitleSource', 'file') as TitleSourceType,
    titleFormat: loadPreference('trackTitleFormat', 'title') as TitleFormatType,
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
        setTitleSource: (state, action: PayloadAction<TitleSourceType>) => {
            state.titleSource = action.payload;
            savePreference('trackTitleSource', state.titleSource);
        },
        setTitleFormat: (state, action: PayloadAction<TitleFormatType>) => {
            state.titleFormat = action.payload;
            savePreference('trackTitleFormat', state.titleFormat);
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
