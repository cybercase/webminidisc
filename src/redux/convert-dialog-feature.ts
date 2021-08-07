import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { savePreference, loadPreference } from '../utils';

export type TitleFormatType = 'filename' | 'title' | 'album-title' | 'artist-title' | 'artist-album-title' | 'title-artist';
export type UploadFormat = 'SP' | 'LP2' | 'LP4';

export interface ConvertDialogFeature {
    visible: boolean;
    format: UploadFormat;
    titleFormat: TitleFormatType;
}

const initialState: ConvertDialogFeature = {
    visible: false,
    format: loadPreference('uploadFormat', 'LP2') as UploadFormat,
    titleFormat: loadPreference('trackTitleFormat', 'filename') as TitleFormatType,
};

const slice = createSlice({
    name: 'convertDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setFormat: (state, action: PayloadAction<UploadFormat>) => {
            state.format = action.payload;
            savePreference('uploadFormat', state.format);
        },
        setTitleFormat: (state, action: PayloadAction<TitleFormatType>) => {
            state.titleFormat = action.payload;
            savePreference('trackTitleFormat', state.titleFormat);
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
