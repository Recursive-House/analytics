
import { createAction } from '@reduxjs/toolkit';
import { AnalyticsInstance } from 'src/api';
import { EVENTS } from '../core-utils';
import pluginReducer from './plugin';
import queueReducer from './queue';
import { coreReducers } from './reducers';
import trackReducer, { track, trackEndAction, trackStartAction } from './track';

export const initializeStartAction = createAction<AnalyticsInstance>(EVENTS.initializeStart);
export const initializeAction = createAction<AnalyticsInstance>(EVENTS.initialize);
export const initializeEndAction = createAction<AnalyticsInstance>(EVENTS.initializeEnd);

export const initializeEvents = (payload?) => [
    initializeStartAction(payload),
    initializeAction(payload),
    (dispatch, getState) => {
        const appState = getState();
        dispatch(initializeEndAction({ ...payload, appState }));
    }
]

export const coreActions = {
    [EVENTS.trackStart]: trackStartAction,
    [EVENTS.track]: track,
    [EVENTS.trackEnd]: trackEndAction,
    [EVENTS.initializeStart]: initializeStartAction,
    [EVENTS.initialize]: initializeAction,
    [EVENTS.initializeEnd]: initializeEndAction,
}

export type RootState = { [K in keyof typeof coreReducers]: ReturnType<typeof coreReducers[K]> }