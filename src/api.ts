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
  createAllPluginReducers,
  createInitializePluginType,
  createReadyPluginType,
  createRegisterPluginType
} from './store/plugins/plugin.utils';
import { get, set, remove } from './utils/storage';
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
  IdentifyPayload,
  enablePluginAction,
  disabledPluginAction,
  identifyEvents,
  resetEvents,
  resetAbortedEvents,
} from './store';
import { CORE_LIFECYLCE_EVENTS, EVENTS } from './utils/core.utils';
import { deleteSensitiveQueue } from './store/queue.utils';
import { watch } from './utils/context.utils';
import { getPageData } from './store/page/page.utils';
import { pageEvents } from './store/page/page';
import { getPersistedUserData, getUserPropFunc, tempKey } from './user/user';
import { isObject } from './utils/analytics.utils';
import { ID } from './utils/constants';
import { ANONID } from './utils/utility';
import { paramsParse } from './utils/params';
import { uuid } from './utils/uuid';

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
  enqueue: (action: PayloadAction<any> | PayloadAction<AbortPayload>) => PayloadAction<any>;
  ready: (callback) => Unsubscribe;
  plugins: ReturnType<typeof createPluginApi>;
}

export interface AnalyticsConfig {
  reducers?: Reducer[];
  plugins?: Plugin[];
  debug: boolean;
  storage?: {
    getItem: Function;
    setItem: Function;
    removeItem: Function;
  };
  initialUser?: {
    traits: any;
  };
}

export interface PluginReducers {
  [name: string]: { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> };
}

const createPluginReducers = (analytics: AnalyticsInstance, plugin: Plugin) => {
  const { name, bootstrap, config } = plugin;
  if (!name) {
    throw new Error(`plugin does not have a name. Please enter a name for your plugin`);
  }
  if (bootstrap && typeof bootstrap === 'function') {
    bootstrap({ instance: analytics, config, payload: plugin });
  }

  return createAllPluginReducers(plugin, analytics);
};
const createPluginApi = (
  store: EnhancedStore<any, any, any> & {
    enqueue: (actions) => {
      type: string;
      payload: QueueAction;
    };
  },
  analytics: AnalyticsInstance
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
    },
    addPlugins: (plugin: Plugin) => {
      const pluginReducer = createPluginReducers(analytics, plugin);

      analytics.enqueue({
        type: createRegisterPluginType(plugin.name),
        payload: { plugin, instance: store }
      });
      const reducers = { ...getReducerStore(), [plugin.name]: pluginReducer };

      // console.ll
      updateReducerStore(reducers);

      // add plugin reducers after processing
      store.replaceReducer(combineReducers(getReducerStore()));
      store.enqueue({
        type: createInitializePluginType(plugin.name)
      });
      store.enqueue({
        type: createReadyPluginType(plugin.name)
      });
    }
  };
};

// TODO: handle dashed naming for plugins
// TODO: setup plugin methods
// TODO: setup user
// TODO: storage events - DONE
// TODO: params - DONE
// TODO: reset events - needs the identity and storage feature feature - DONE
// TODO: identify events - DONE
// TODO: page events -  DONE
// TODO: once lifecycle call - DONE
// TODO: turn queue on or off if online or offline - DONE
// TODO: network events - DONE
// TODO: disable plugins in plugin calls - DONE
// TODO: enable plugins in plugin calls - DONE
// TODO: add async plugin functionality - DONE
// TODO: disable tracking for specific plugins on specific calls - DONE
// TODO: Debug flag implementation - DONE
// TODO: abort functionality - DONE
export function Analytics(config: AnalyticsConfig) {
  const storage = config.storage
    ? config.storage
    : {
        getItem: get,
        setItem: set,
        removeItem: remove
      };

  const getUserProp = getUserPropFunc(storage);

  const analytics = {
    identify: async (userId, traits, options, callback) => {
      const id = typeof userId === 'string' ? userId : null;
      const data = isObject(userId) ? userId : traits;
      const opts = options || {};
      const user = analytics.user();

      /* sets temporary in memory id. Not to be relied on */
      set(tempKey(ID), id);

      const resolvedId = id || data.userId || getUserProp(ID, analytics, data);

      return new Promise((resolve) => {
        const identifyPayload: IdentifyPayload = {
          userId: resolvedId,
          traits: data || {},
          options: opts,
          storage,
          analytics,
          anonymousId: user.anonymousId
        };

        const identifyPayloadAfter: IdentifyPayload = {
          ...identifyPayload,
          _callback: callback,
          _context: resolve
        };

        store.dispatch((dispatch) => {
          dispatch(store.enqueue(identifyEvents(identifyPayloadAfter)));
        });
      });
    },

    user: (key?: string) => {
      if (key === ID || key === 'id') {
        return getUserProp(ID, analytics);
      }
      if (key === ANONID || key === 'anonId') {
        return getUserProp(ANONID, analytics);
      }
      const user = analytics.getState('user');
      if (!key) return user;
      return user[key];
    },

    reset: (callback) => {
      return new Promise((resolve) => {
        store.dispatch(
          store.enqueue(
            resetEvents({
              storage,
              _callback: callback,
              analytics,
              _context: resolve
            })
          )
        );
      });
    },

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

    page: (data, options, callback) => {
      return new Promise((resolve) => {
        const opts = options || {};
        const { plugins } = opts;
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

        if (typeof data === 'function') callback = data;

        const pagePayloadAfter = {
          properties: getPageData(Object.keys(data).length ? data : {}),
          options: {
            ...(Object.keys(opts).length ? options : {}),
            disabledPlugins: { ...pluginsEnabledState, ...enabledStates }
          },
          _context: resolve,
          _callback: callback
        };
        store.dispatch((dispatch) => {
          dispatch(store.enqueue(pageEvents(pagePayloadAfter)));
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

    once: (name, callback) => {
      if (!name || typeof callback === 'function') {
        return false;
      }
      const detachOnListner = analytics.on(name, ({ payload }) => {
        callback({
          // eslint-disable-line
          payload: payload,
          instance: analytics,
          plugins: Object.entries(store.getState().plugin).map(([_, plugin]) => plugin)
        });
        detachOnListner();
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

    enqueue: (action: QueueAction) => {
      return store.dispatch(store.enqueue(action));
    },

    getState: (stateKey?: string): RootState => {
      const state = store.getState();
      return stateKey ? { ...state }[stateKey] : { ...state };
    },

    plugins: {} as ReturnType<typeof createPluginApi>,
    storage
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
      resetAbortedEvents();
      return deleteSensitiveQueue(store as any, analytics)(actions);
    }
  };

  const params = paramsParse();

  const initialUser = config.initialUser || {};

  const persistedUser = getPersistedUserData(storage);
  const visitorInfo = {
    ...persistedUser,
    ...initialUser,
    ...(!params.an_uid ? {} : { userId: params.an_uid }),
    ...(!params.an_aid ? {} : { anonymousId: params.an_aid })
  };

  visitorInfo.anonymousId = visitorInfo.anonymousId ? uuid() : visitorInfo.anonymousId;

  const plugins = config.plugins || [];
  analytics.plugins = createPluginApi(store, analytics);

  const pluginReducers = plugins.reduce((allPluginReducers, plugin: Plugin, currentIndex: number) => {
    const { name } = plugin;
    if (!name) {
      throw new Error(
        `plugin does not have a name. Please enter a name for your plugin ${JSON.stringify(plugin)} at ${currentIndex}`
      );
    }
    allPluginReducers[plugin.name] = createPluginReducers(analytics, plugin);

    analytics.enqueue({
      type: createRegisterPluginType(plugin.name),
      payload: { plugin, instance: store }
    });

    return allPluginReducers;
  }, {} as { [key: string]: ReducerWithInitialState<PluginProcessedState> });

  const reducers = { ...pluginReducers, ...coreReducers };

  updateReducerStore(reducers);
  // add plugin reducers after processing

  store.replaceReducer(combineReducers(getReducerStore()));

  analytics.enqueue(identifyEvents({...visitorInfo, storage }));
  analytics.enqueue(initializeEvents());
  analytics.enqueue(readyAction());

  watch((online) => {
    store.dispatch({
      type: online ? EVENTS.online : EVENTS.offline
    });
  });
  return { analytics, store };
}

export type AnalyticsModule = ReturnType<typeof Analytics>['analytics'];
