import pluginReducer from './plugin';
import queueReducer from './queue';
import trackReducer from './track';

export const coreReducers = {
    track: trackReducer,
    queue: queueReducer,
    plugin: pluginReducer,
}