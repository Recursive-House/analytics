
import { EVENTS } from '../core-utils';
import queueReducer from './queue';
import trackReducer, { track, trackEndAction, trackStartAction } from './track';

export const coreReducers = {
    track: trackReducer,
    queue: queueReducer
}

export const coreActions = {
    [EVENTS.trackStart]: trackStartAction,
    [EVENTS.track]: track,
    [EVENTS.trackEnd]: trackEndAction
}

export type RootState = { [ K in keyof typeof coreReducers ]: ReturnType<typeof coreReducers[K]> }
