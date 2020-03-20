import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { savePreference, loadPreference } from '../utils';

type Views = 'WELCOME' | 'MAIN';

export interface AppState {
    mainView: Views;
    loading: boolean;
    pairingFailed: boolean;
    pairingMessage: string;
    browserSupported: boolean;
    darkMode: boolean;
    aboutDialogVisible: boolean;
}

const initialState: AppState = {
    mainView: 'WELCOME',
    loading: false,
    pairingFailed: false,
    pairingMessage: ``,
    browserSupported: true,
    darkMode: loadPreference('darkMode', false),
    aboutDialogVisible: false,
};

export const slice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setState: (state, action: PayloadAction<Views>) => {
            state.mainView = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setPairingFailed: (state, action: PayloadAction<boolean>) => {
            state.pairingFailed = action.payload;
        },
        setPairingMessage: (state, action: PayloadAction<string>) => {
            state.pairingMessage = action.payload;
        },
        setBrowserSupported: (state, action: PayloadAction<boolean>) => {
            state.browserSupported = action.payload;
        },
        setDarkMode: (state, action: PayloadAction<boolean>) => {
            state.darkMode = action.payload;
            savePreference('darkMode', state.darkMode);
        },
        showAboutDialog: (state, action: PayloadAction<boolean>) => {
            state.aboutDialogVisible = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
