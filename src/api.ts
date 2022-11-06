import {
  configureStore,
  Reducer,
  combineReducers,
  PayloadAction,
  AnyAction,
  Unsubscribe,
  Action,
  EnhancedStore
} from '@reduxjs/toolkit';
import {
  clearPluginAbortEventsAction,
  createAllPluginReducers,
  createRegisterPluginType
} from './store/plugins/plugin.utils';
import { CaseReducer, ReducerWithInitialState } from '@reduxjs/toolkit/dist/createReducer';
import { AbortPayload, queueProcessorMiddleware } from './plugins/queueProcessor';
import { trackEvents, TrackOptions } from './store/track';
import { Plugin, PluginProcessedState } from './store/plugins/plugin.types';
import {
  coreReducers,
  initializeEvents,
  readyAction,
  updateReducerStore,
  getReducerStore,
  QueueAction,
  RootState,
  TrackPayload,
  enablePluginAction,
  disabledPluginAction
} from './store';
import { CORE_LIFECYLCE_EVENTS, EVENTS } from './core-utils';
import { abortSensitiveQueue, getAbortedPluginReducers } from './store/queue.utils';

export interface AnalyticsInstance {
  track: (
    eventName: string,
    payload: Function | ({ event: string } & Record<string, any>),
    options?: TrackOptions,
    callback?: Function
  ) => void;
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
  plugins: ReturnType<typeof createPluginApi>;
}

export interface AnalyticsConfig {
  reducers?: Reducer[];
  plugins?: Plugin[];
  debug: boolean;
}

export interface PluginReducers {
  [name: string]: { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> };
}

const createPluginApi = (
  store: EnhancedStore<any, any, any> & {
    enqueue: (actions) => {
      type: string;
      payload: QueueAction;
    };
  }
) => {
  return {
    enable: (pluginNames: string[] | string) => {
      const currentPlugins = Object.entries<PluginProcessedState>(store.getState().plugin).map(
        ([_, plugin]) => plugin.name
      );
      if (Array.isArray(pluginNames)) {
        pluginNames.forEach((pluginName) => {
          if (!currentPlugins.includes(pluginName)) {
            console.warn(`${pluginName} does not exist`);
          }
        });
      } else {
        if (!currentPlugins.includes(pluginNames)) {
          console.warn(`${pluginNames} does not exist as plugin`);
        }
      }

      return new Promise((resolve) => {
        store.dispatch((dispatch) =>
          dispatch(
            store.enqueue({
              type: enablePluginAction.type,
              payload: pluginNames,
              _context: resolve
            })
          )
        );
      });
    },
    disable: (pluginNames: string[] | string) => {
      const currentPlugins = Object.entries<PluginProcessedState>(store.getState().plugin).map(
        ([_, plugin]) => plugin.name
      );
      if (Array.isArray(pluginNames)) {
        pluginNames.forEach((pluginName) => {
          if (!currentPlugins.includes(pluginName)) {
            console.warn(`${pluginName} does not exist`);
          }
        });
      } else {
        if (!currentPlugins.includes(pluginNames)) {
          console.warn(`${pluginNames} does not exist as plugin`);
        }
      }

      return new Promise((resolve) => {
        store.dispatch((dispatch) =>
          dispatch(
            store.enqueue({
              type: disabledPluginAction.type,
              payload: pluginNames,
              _context: resolve
            })
          )
        );
      });
    }
  };
};

// TODO: handle dashed naming for plugins
// TODO: setup plugin methods
// TODO: params
// TODO: identify events
// TODO: storage events
// TODO: network events
// TODO: reset events
// TODO: disable plugins in plugin calls
// TODO: enable plugins in plugin calls
// TODO: add async plugin functionality - DONE
// TODO: disable tracking for specific plugins on specific calls - DONE
// TODO: Debug flag implementation - DONE
// TODO: abort functionality - DONE
export function Analytics(config: AnalyticsConfig) {
  const analytics = {
    // eventName, payload, options, callback
    track: async (
      eventName: string,
      payload: Record<string, any>,
      options: TrackOptions = { plugins: {} } as TrackOptions,
      callback?: Function
    ) => {
      if (!eventName) {
        throw new TypeError('event is missing in track call');
      }

      const hasCallBack =
        typeof payload === 'function' ? payload : typeof callback === 'function' ? callback : undefined;
      const { plugins } = options;
      const { all, ...enabledStates } = plugins ? plugins : { all: true };

      // facilitates disabling plugins
      const pluginsEnabledState = !all
        ? Object.entries(store.getState().plugin)
            .map(([_, plugin]) => plugin.name)
            .reduce((enabledPluginState, plugin) => {
              enabledPluginState[plugin] = false;
              return enabledPluginState;
            }, {})
        : {};

      return new Promise((resolve) => {
        const trackPayload: TrackPayload = {
          event: eventName,
          properties: typeof payload === 'function' ? undefined : payload,
          options: {
            disabledPlugins: { ...pluginsEnabledState, ...enabledStates }
          }
        };

        const trackPayloadAfter: TrackPayload = {
          ...trackPayload,
          _callback: hasCallBack,
          _context: resolve
        };

        store.dispatch((dispatch) => {
          dispatch(store.enqueue(trackEvents(trackPayloadAfter)));
        });
      });
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
            plugins: Object.entries(store.getState().plugin).map(([_, plugin]) => plugin)
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
    },

    plugins: {} as ReturnType<typeof createPluginApi>
  };

  // create store
  const baseStore = configureStore({
    reducer: { ...coreReducers },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false
      }).concat(queueProcessorMiddleware),
    devTools: Boolean(config.debug) && {
      maxAge: 1000,
      shouldHotReload: false
    }
  });

  const store = {
    ...baseStore,
    enqueue: (actions) => {
      return abortSensitiveQueue(store as any, analytics)(actions);
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
    if (bootstrap && typeof bootstrap === 'function') {
      bootstrap({ instance: analytics, config, payload: plugin });
    }

    allPluginReducers[plugin.name] = createAllPluginReducers(plugin, analytics);

    analytics.enqueue({
      type: createRegisterPluginType(plugin.name),
      payload: { plugin, instance: store }
    });

    return allPluginReducers;
  }, {} as { [key: string]: ReducerWithInitialState<PluginProcessedState> });

  const reducers = { ...pluginReducers, ...coreReducers };

  updateReducerStore(reducers);
  analytics.plugins = createPluginApi(store);
  // add plugin reducers after processing
  store.replaceReducer(combineReducers(getReducerStore()));

  analytics.enqueue(initializeEvents());
  analytics.enqueue(readyAction());

  return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>['analytics'];
