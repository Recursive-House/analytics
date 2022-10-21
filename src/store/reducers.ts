import { createAction } from '@reduxjs/toolkit';
import { EVENTS } from '../core-utils';
import pluginReducer from './plugin';
import queueReducer from './queue';
import trackReducer from './track';


export const readyAction = createAction(EVENTS.ready);

const readyReducer = (state = false, action) => {

    switch (action.type) {
        case readyAction.type:
            state = true;
            return state;
    }
    return state;
}

export const coreReducers = {
    track: trackReducer,
    queue: queueReducer,
    plugin: pluginReducer,
    ready: readyReducer,
    lastAction: (state, action) => state = action,
}