import { configureStore, Reducer, createReducer, createAction, AnyAction } from '@reduxjs/toolkit';
import { Plugin, PluginReducerState } from './store/plugins';
import { queueProcessorMiddleware } from './plugins/queueProcessor';
import { enqueue } from './store/queue';
import { coreReducers } from './store/store';
import { trackEvents } from './store/track';
import { createCorePluginReducer } from './plugins/pluginMIddleware';
import { ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { LIFECYLCE_EVENTS } from './core-utils';

export interface AnalyticsInstance {
    track: (
        eventName,
        payload) => void;
}

export interface AnalyticsConfig {
    reducers?: Reducer[];
    plugins?: Plugin[];
    debug: boolean;
}

export interface AllPlugins {
    [name: string]: ReducerWithInitialState<PluginReducerState>;
}

export function Analytics(config: AnalyticsConfig) {

    let analytics: AnalyticsInstance;
    const plugins = config.plugins || [];
    const pluginReducers = plugins.reduce((
        allPluginReducers: AllPlugins,
        plugin: Plugin,
        currentIndex: number,
    ) => {
        if (!plugin.name) {
            throw new Error(`plugin does not have a name. Please enter a name for your plugin. Plugin present at index ${currentIndex}`);
        }
        const { name, enabled, initialize, loaded, config, ...pluginProperties } = plugin;
        const { pluginCoreReducer, pluginInitialState } = createCorePluginReducer(plugin, analytics);
        const pluginReducer = Object.keys(pluginProperties).reduce((reducer, pluginKey) => {
            if (!LIFECYLCE_EVENTS[pluginKey] && plugin[pluginKey]) {
                reducer[pluginKey] = (state: PluginReducerState, action: AnyAction) => plugin[pluginKey](
                    {
                        payload: action.payload,
                        config,
                        instance: analytics,
                        state
                    });
            }
            return reducer;
        }, pluginCoreReducer);
        console.log(pluginReducer);
        allPluginReducers[name] = createReducer(pluginInitialState, pluginReducer);
        return allPluginReducers;
    }, {} as AllPlugins);


    analytics = {
        track: async (eventName, payload) => {
            if (!eventName) {
                throw new Error('event is missing in track call');
            }

            return store
                .dispatch(dispatch =>
                    dispatch(enqueue(trackEvents(payload))));
        }
    }

    const store = configureStore({
        reducer: { ...coreReducers, ...pluginReducers },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(queueProcessorMiddleware),
        devTools: {
            maxAge: 1000,
        }
    });

    return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>["analytics"];