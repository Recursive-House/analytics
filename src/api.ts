import { configureStore, Reducer } from '@reduxjs/toolkit';
import { Plugin } from './store/plugins';
import { EVENTS } from './core-utils';
import { queueProcessorMiddleware } from './plugins/queueProcessor';
import { enqueue } from './store/queue';
import { coreReducers } from './store/store';

export interface AnalyticsConfig {
    reducers: Reducer[];
    plugins: Plugin[];
    debug: boolean;
}

export function Analytics(config: AnalyticsConfig) {

    const analytics = {
        track: async (eventName: string, payload, options?) => {
            if (!eventName) {
                throw new Error('event is missing in track call');
            }

            return store.dispatch((dispatch) => dispatch(enqueue({
                type: EVENTS.trackStart,
                payload: {
                    event: eventName,
                    properties: payload,
                    options,
                }
            })));
        }
    }

    const store = configureStore({
        reducer: coreReducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(queueProcessorMiddleware),
    });


    return { analytics, store };
}