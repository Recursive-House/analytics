
import { createAction } from '@reduxjs/toolkit';
import { EVENTS } from '../core-utils';
import pluginReducer from './plugin';
import queueReducer from './queue';
import { coreReducers } from './reducers';
import trackReducer, { track, trackEndAction, trackStartAction } from './track';

const initializeStartAction = createAction(EVENTS.initializeStart);
const initializeAction = createAction(EVENTS.initialize);
const initializeEndAction = createAction(EVENTS.initializeEnd);

export const initializeEvents = (payload?) => [
    initializeStartAction(),
    initializeAction(),
    initializeEndAction()
]

export const coreActions = {
    [EVENTS.trackStart]: trackStartAction,
    [EVENTS.track]: track,
    [EVENTS.trackEnd]: trackEndAction,
    [EVENTS.initializeStart]: initializeStartAction,
    [EVENTS.initialize]: initializeAction,
    [EVENTS.initializeEnd]: initializeEndAction,
}

export type RootState = { [ K in keyof typeof coreReducers ]: ReturnType<typeof coreReducers[K]> }