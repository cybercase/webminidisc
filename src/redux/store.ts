import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import uploadDialog from './upload-dialog-feature';
import renameDialog from './rename-dialog-feature';
import errorDialog from './error-dialog-feature';
import convertDialog from './convert-dialog-feature';
import appState from './app-feature';
import main from './main-feature';

export const store = configureStore({
    reducer: {
        renameDialog,
        uploadDialog,
        errorDialog,
        convertDialog,
        appState,
        main,
    },
    middleware: [...getDefaultMiddleware()],
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
