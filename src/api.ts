import { configureStore, Reducer, createReducer, combineReducers, Store, PayloadAction } from '@reduxjs/toolkit';
import { createCorePluginReducer, createPluginSpecificReducers } from './store/plugin.utils';
import { ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { queueProcessorMiddleware } from './plugins/queueProcessor';
import { enqueue } from './store/queue';
import { trackEvents } from './store/track';
import { Plugin, PluginProcessedState } from './store/plugin.types';
import { coreReducers, createRegisterPluginType, initializeEvents } from './store';
import { RootState } from './store';

export interface AnalyticsInstance {
    track: (
        eventName,
        payload) => void;
    getState: () => RootState;
    on: Function;
    dispatch: Function;
}

export interface AnalyticsConfig {
    reducers?: Reducer[];
    plugins?: Plugin[];
    debug: boolean;
}

export interface PluginReducers {
    [name: string]: ReducerWithInitialState<PluginProcessedState>;
}

export function Analytics(config: AnalyticsConfig) {

    let analytics: AnalyticsInstance;
    analytics = {
        ...analytics,
        track: async (eventName, payload) => {
            if (!eventName) {
                throw new Error('event is missing in track call');
            }

            return store
                .dispatch(dispatch =>
                    dispatch(enqueue(trackEvents(payload))));
        },

        on: () => ({}),
        dispatch: () => ({}),

        getState: (): RootState => {
            const state = store.getState();
            return { ...state };
        }
    }

    // create store
    const baseStore = configureStore({
        reducer: { ...coreReducers },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({
            serializableCheck: false
            
            // {
            //     ignoredActionPaths: [
            //         'payload.plugin',
            //         'payload.instance',
            //         'payload.payload.plugin',
            //         'payload.payload.instance'
            //     ],
            //     ignoredPaths: ['plugin', 'queue']
            // }
        }).concat(queueProcessorMiddleware),
        devTools: {
            maxAge: 1000,
        }
    });



    type ExtendedEnhancedStore = typeof baseStore & {
        enqueue: (
            action: PayloadAction<any> | PayloadAction<any>[]
        ) => void
    }
    const store: ExtendedEnhancedStore = {
        ...baseStore,
        enqueue: (actions: PayloadAction<any> | PayloadAction<any>[]) => {
            store.dispatch(enqueue(actions));
        }
    };


    const plugins = config.plugins || [];
    const pluginReducers = plugins.reduce((
        allPluginReducers: PluginReducers,
        plugin: Plugin,
        currentIndex: number,
    ) => {
        if (!plugin.name) {
            throw new Error(`plugin does not have a name. Please enter a name for your plugin. Plugin present at index ${currentIndex}`);
        }
        const { pluginCoreReducer, pluginInitialState } = createCorePluginReducer(plugin, analytics);
        const pluginSpecificReducers = createPluginSpecificReducers(plugin, analytics);

        store.enqueue({
            type: createRegisterPluginType(pluginInitialState.name),
            payload: { plugin, instance: store }
        });
        const pluginReducers = { ...pluginCoreReducer, ...pluginSpecificReducers };
        allPluginReducers[plugin.name] = createReducer(pluginInitialState, pluginReducers);
        return allPluginReducers;
    }, {} as PluginReducers);

    // add plugin reducers after processing
    store.replaceReducer(combineReducers({ ...pluginReducers,...coreReducers}));
    store.enqueue(initializeEvents());

    return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>["analytics"];