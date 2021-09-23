import { configureStore, getDefaultMiddleware, Middleware, combineReducers } from '@reduxjs/toolkit';
import uploadDialog from './upload-dialog-feature';
import renameDialog from './rename-dialog-feature';
import errorDialog from './error-dialog-feature';
import panicDialog, { actions as panicDialogActions } from './panic-dialog-feature';
import convertDialog from './convert-dialog-feature';
import dumpDialog from './dump-dialog-feature';
import recordDialog from './record-dialog-feature';
import appState, { actions as appActions, buildInitialState as buildInitialAppState } from './app-feature';
import main from './main-feature';

const errorCatcher: Middleware = store => next => async action => {
    try {
        await next(action);
    } catch (e) {
        console.error(e);
        next(panicDialogActions.setVisible(true));
    }
};

let reducer = combineReducers({
    renameDialog,
    uploadDialog,
    errorDialog,
    panicDialog,
    convertDialog,
    dumpDialog,
    recordDialog,
    appState,
    main,
});

const resetStateAction = appActions.setMainView.toString();
const resetStatePayoload = 'WELCOME';
const resetStateReducer: typeof reducer = function(...args) {
    const [state, action] = args;
    if (action.type === resetStateAction && action.payload === resetStatePayoload) {
        return {
            ...initialState,
            appState: buildInitialAppState(),
        };
    }
    return reducer(...args);
};

export const store = configureStore({
    reducer: resetStateReducer,
    middleware: [errorCatcher, ...getDefaultMiddleware()],
});

const initialState = Object.freeze(store.getState());

export type AppStore = typeof store;
export type AppSubscribe = typeof store.subscribe;
export type AppGetState = typeof store.getState;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
