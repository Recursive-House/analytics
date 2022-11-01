import {
  configureStore,
  Reducer,
  combineReducers,
  PayloadAction,
  AnyAction,
  Unsubscribe,
  Action
} from '@reduxjs/toolkit';
import { clearPluginAbortEventsAction, createAllPluginReducers, createRegisterPluginType } from './store/plugins/plugin.utils';
import { CaseReducer, ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { AbortPayload, queueProcessorMiddleware } from './plugins/queueProcessor';
import { trackEvents } from './store/track';
import { Plugin, PluginProcessedState } from './store/plugins/plugin.types';
import {
  coreReducers,
  initializeEvents,
  readyAction,
  updateReducerStore,
  getReducerStore,
  QueueAction,
  RootState,
  TrackPayload
} from './store';
import { CORE_LIFECYLCE_EVENTS, EVENTS } from './core-utils';
import {
  abortSensitiveQueue,
  getAbortedPluginReducers,
} from './store/queue.utils';

export interface AnalyticsInstance {
  track: (eventName: string, payload, disabledPlugins?: Record<string, boolean>) => void;
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

// TODO: disable tracking for specific looks on specific calls - DONE
// TODO: handle dashed naming for plugins
// TODO: setup plugin methods
// TODO: params
// TODO: identify events
// TODO: storage events
// TODO: network events
// TODO: reset events
// TODO: Debug flag implementation - DONE
// TODO: abort functionality - DONE
export function Analytics(config: AnalyticsConfig) {
  const analytics = {
    track: async (eventName:string, trackData, disabledPlugins?: Record<string, boolean>) => {
      if (!eventName) {
        throw new TypeError('event is missing in track call');
      }

      const trackPayload: TrackPayload = {
        event: trackData.event,
        properties: trackData,
        options: {
          disabledPlugins
        }
      }
      return Promise.resolve(
        store.dispatch((dispatch) => {
          dispatch(store.enqueue(trackEvents(trackPayload)));
        })
      );
    },

    on: (name: string, callback: Function): Unsubscribe => {
      if (!name || typeof callback !== 'function') {
        throw new TypeError(`name or callback but on feature invalid name: ${name}, callback: ${callback}`);
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
      if (readyCalled) {
        callback({ plugins, instance: analytics });
        return;
      }
      return analytics.on(EVENTS.ready, (x) => {
        callback(x);
        store.dispatch(readyAction());
      });
    },

    dispatch: () => ({}),

    abortEvent: (action: PayloadAction<AbortPayload>) => {
      if (!action.payload.pluginEvent) throw new Error('pluginEvent passed is not defined');
      const pluginReducers = getAbortedPluginReducers(store, analytics, new Set([action.payload.pluginEvent]));
      store.replaceReducer(combineReducers({ ...getReducerStore(), ...pluginReducers }));
      store.dispatch(clearPluginAbortEventsAction());
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
    devTools: Boolean(config.debug) && ({
      maxAge: 1000,
      shouldHotReload: false
    })
  });

  const store = {
    ...baseStore,
    enqueue: (actions) => {
      return abortSensitiveQueue(store as any, analytics)(actions);
    }
  };

  const plugins = config.plugins || [];

  // check if plugins are unique

  const pluginReducers = plugins.reduce((allPluginReducers, plugin: Plugin, currentIndex: number) => {
    const { name, bootstrap, config } = plugin;
    if (!name) {
      throw new Error(
        `plugin does not have a name. Please enter a name for your plugin. Plugin present at index ${currentIndex}`
      );
    }
    if (bootstrap && typeof bootstrap === 'function') {
      bootstrap({ instance: analytics, config, payload: plugin });
    }

    allPluginReducers[plugin.name] = createAllPluginReducers(plugin, analytics);

    store.enqueue({
      type: createRegisterPluginType(plugin.name),
      payload: { plugin, instance: store }
    });

    return allPluginReducers;
  }, {} as { [key: string]: ReducerWithInitialState<PluginProcessedState> });

  const reducers = { ...pluginReducers, ...coreReducers };

  updateReducerStore(reducers);
  // add plugin reducers after processing
  store.replaceReducer(combineReducers(getReducerStore()));
  store.dispatch(store.enqueue(initializeEvents()));
  store.dispatch(store.enqueue(readyAction()));

  return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>['analytics'];
