import { configureStore, Reducer, createReducer, combineReducers, Store, PayloadAction, AnyAction, Unsubscribe } from '@reduxjs/toolkit';
import { createCorePluginReducer, createPluginSpecificReducers } from './store/plugin.utils';
import { ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { queueProcessorMiddleware } from './plugins/queueProcessor';
import { enqueue } from './store/queue';
import { trackEvents } from './store/track';
import { Plugin, PluginProcessedState } from './store/plugin.types';
import { coreReducers, createRegisterPluginType, initializeEvents, readyAction } from './store';
import { RootState } from './store';
import { EVENTS } from './core-utils';

export interface AnalyticsInstance {
    track: (
        eventName,
        payload) => Promise<AnyAction>;
    getState: () => RootState;
    on: (name: string,
        callback: ({
            payload,
            instance,
            plugins }: {
                payload: AnyAction,
                instance: AnalyticsInstance,
                plugins: Plugin[]
            }) => void
    ) => Unsubscribe;
    dispatch: Function;
    ready: (callback) => Unsubscribe;
}

export interface AnalyticsConfig {
    reducers?: Reducer[];
    plugins?: Plugin[];
    debug: boolean;
}

export interface PluginReducers {
    [name: string]: ReducerWithInitialState<PluginProcessedState>;
}


// TODO: abort functionality
// Debug flag implementation
// params
// identify events
// storage events
// network events
// reset events
export function Analytics(config: AnalyticsConfig) {

    const analytics: AnalyticsInstance = {
        track: async (eventName, payload) => {
            if (!eventName) {
                throw new Error('event is missing in track call');
            }

            return Promise.resolve(store
                .dispatch(dispatch =>
                    dispatch(enqueue(trackEvents(payload)))));
        },

        on: (name: string,
            callback: Function,
        ): Unsubscribe => {
            if (!name || !(typeof callback === 'function')) {
                return () => ({});
            }
            return store.subscribe(() => {
                const action = analytics.getState().lastAction;
                if (action.type === name) callback({ payload: action, instance: analytics, plugins: config.plugins });
            });
        },

        ready: (callback: ({ plugins, instance }: { plugins: Plugin[], instance: AnalyticsInstance }) => void) => {
            const readyCalled = analytics.getState().ready;
            if (readyCalled) callback({ plugins, instance: analytics });
            return analytics.on(EVENTS.ready, (x) => {
                callback(x)
                analytics.dispatch(readyAction());
            })
        },

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
        }).concat(queueProcessorMiddleware),
        devTools: {
            maxAge: 1000,
        }
    });



    type ExtendedEnhancedStore = typeof baseStore & {
        enqueue: (
            actions: PayloadAction<any>
                | PayloadAction<any>[]
                | Function[]
                | (PayloadAction<any> | Function)[]
        ) => void
    }
    const store: ExtendedEnhancedStore = {
        ...baseStore,
        enqueue: (actions) => {
            store.dispatch(enqueue(actions));
        }
    };


    const plugins = config.plugins || [];
    const pluginReducers = plugins.reduce((
        allPluginReducers: PluginReducers,
        plugin: Plugin,
        currentIndex: number,
    ) => {
        const { name, bootstrap, config } = plugin;
        if (!name) {
            throw new Error(`plugin does not have a name. Please enter a name for your plugin. Plugin present at index ${currentIndex}`);
        }
        const { pluginCoreReducer, pluginInitialState } = createCorePluginReducer(plugin, analytics);
        const pluginSpecificReducers = createPluginSpecificReducers(plugin, analytics);

        if (bootstrap && typeof bootstrap === 'function') {
            bootstrap({ instance: analytics, config, payload: plugin });
        }

        store.enqueue({
            type: createRegisterPluginType(pluginInitialState.name),
            payload: { plugin, instance: store }
        });
        const pluginReducers = { ...pluginCoreReducer, ...pluginSpecificReducers };
        allPluginReducers[plugin.name] = createReducer(pluginInitialState, pluginReducers);
        return allPluginReducers;
    }, {} as PluginReducers);

    // add plugin reducers after processing
    store.replaceReducer(combineReducers({ ...pluginReducers, ...coreReducers }));

    store.enqueue(initializeEvents());
    store.enqueue(readyAction());

    return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>["analytics"];