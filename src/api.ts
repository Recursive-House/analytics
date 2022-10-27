import {
  configureStore,
  Reducer,
  createReducer,
  combineReducers,
  PayloadAction,
  AnyAction,
  Unsubscribe,
  Action
} from '@reduxjs/toolkit';
import {
  createCorePluginReducer,
  createPluginSpecificReducers,
  createRegisterPluginType
} from './store/plugins/plugin.utils';
import { CaseReducer, ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { AbortPayload, queueProcessorMiddleware } from './plugins/queueProcessor';
import { trackEvents } from './store/track';
import { Plugin, PluginProcessedState } from './store/plugins/plugin.types';
import {
  coreReducers,
  // createRegisterPluginType,
  initializeEvents,
  readyAction,
  updateReducerStore,
  getReducerStore,
  QueueAction,
  RootState
} from './store';

// import { abortSensitiveQueue } from './store/queue';
import { CORE_LIFECYLCE_EVENTS, EVENTS } from './core-utils';
import { abortSensitiveQueue, getAbortedReducers, replaceAbortedReducer } from './store/queue.utils';

export interface AnalyticsInstance {
  track: (eventName, payload) => void; //Promise<AnyAction>;
  getState: () => RootState;
  on: (
    name: string,
    callback: ({
      payload,
      instance,
      plugins
    }: {
      payload: AnyAction;
      instance: AnalyticsInstance;
      plugins: Plugin[];
    }) => void
  ) => Unsubscribe;
  dispatch: Function;
  abortEvent: Function;
  enqueue: (action: PayloadAction<any> | PayloadAction<AbortPayload>) => PayloadAction<any>;
  ready: (callback) => Unsubscribe;
}

export interface AnalyticsConfig {
  reducers?: Reducer[];
  plugins?: Plugin[];
  debug: boolean;
}

export interface PluginReducers {
  [name: string]: { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> };
}

// handle dashed naming for plugins
// setup plugin methods
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

      return Promise.resolve(
        store.dispatch((dispatch) => {
          dispatch(store.enqueue(trackEvents(payload)));
        })
      );
    },

    on: (name: string, callback: Function): Unsubscribe => {
      if (!name || !(typeof callback === 'function')) {
        return () => ({});
      }
      return store.subscribe(() => {
        const action = analytics.getState().lastAction;
        if (action.type === name)
          callback({
            payload: action,
            instance: analytics,
            plugins: config.plugins
          });
      });
    },

    ready: (callback: ({ plugins, instance }: { plugins: Plugin[]; instance: AnalyticsInstance }) => void) => {
      const readyCalled = analytics.getState().ready;
      if (readyCalled) callback({ plugins, instance: analytics });
      return analytics.on(EVENTS.ready, (x) => {
        callback(x);
        analytics.dispatch(readyAction());
      });
    },

    dispatch: () => ({}),

    abortEvent: (action: PayloadAction<AbortPayload>) => {
      const abortedReducersMap = getAbortedReducers(new Set([action.payload.pluginEvent]));
      const analyticsState = store.getState();
      console.log('get states during abort event', analyticsState);
      const pluginStates = Object.keys(abortedReducersMap).reduce(
        (allPluginStates, pluginName) => ((allPluginStates[pluginName] = analyticsState[pluginName]), allPluginStates),
        {}
      );
      console.log('abortedReducers', abortedReducersMap);
      const pluginReducers = Object.keys(abortedReducersMap).reduce(
        (result, key) => (
          console.log('plugin state', key, pluginStates[key]),
          (result[key] = createReducer(pluginStates[key], abortedReducersMap[key])),
          result
        ),
        {}
      );
      if (Object.keys(abortedReducersMap).length) {
        console.log('pluginReducers', pluginReducers, getReducerStore());
        store.replaceReducer(combineReducers({ ...getReducerStore(), ...pluginReducers }));
      }
    },

    enqueue: (action: QueueAction) => {
      return store.dispatch(store.enqueue(action));
    },

    getState: (): RootState => {
      const state = store.getState();
      return { ...state };
    }
  };

  // create store
  const baseStore = configureStore({
    reducer: { ...coreReducers },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      }).concat(queueProcessorMiddleware),
    devTools: {
      maxAge: 1000
    }
  });

  const store = {
    ...baseStore,
    enqueue: (actions) => {
      return abortSensitiveQueue(store as any)(actions);
    }
  };

  const plugins = config.plugins || [];
  const pluginReducers = plugins.reduce((allPluginReducers, plugin: Plugin, currentIndex: number) => {
    const { name, bootstrap, config } = plugin;
    if (!name) {
      throw new Error(
        `plugin does not have a name. Please enter a name for your plugin. Plugin present at index ${currentIndex}`
      );
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

    const pluginReducers = {
      ...pluginCoreReducer,
      ...pluginSpecificReducers
    };
    allPluginReducers[plugin.name] = createReducer(pluginInitialState, pluginReducers);
    return allPluginReducers;
  }, {}  as { [key: string]: ReducerWithInitialState<PluginProcessedState> });

  console.log('pluginReducerssss', pluginReducers);
  const reducers = { ...pluginReducers, ...coreReducers };

  updateReducerStore(reducers);

  console.log('initial reducers', getReducerStore());
  // add plugin reducers after processing
  store.replaceReducer(combineReducers(getReducerStore()));
  console.log('store', store.getState());
  store.dispatch(store.enqueue(initializeEvents()));
  store.dispatch(store.enqueue(readyAction()));

  return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>['analytics'];
