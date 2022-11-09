import { Action, AnyAction, CaseReducer, createAction, createReducer, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../../api';
import { CORE_LIFECYLCE_EVENTS, EVENTS, LIFECYLCE_EVENTS } from '../../utils/core.utils';
import { Config, Plugin, PluginProcessedState } from './plugin.types';
import { coreActions } from '../store';
import plugin from './plugin';

export const pluginMethods = {};

export const createPluginState = (name: string, enabled: boolean, initialized: boolean, config) =>
  ({
    name,
    enabled,
    initialized,
    abortableEvents: {},
    loaded: false,
    config
  } as PluginProcessedState);

export function updatePluginMethodsEvents(plugin: Plugin, event: string) {
  if (typeof plugin.name !== 'string' || typeof event !== 'string' || !event) {
    throw new TypeError(`plugin method update as invalid plugin or event ${plugin.name}`);
  }

  pluginMethods[plugin.name] = {
    ...(pluginMethods[plugin.name] || {})
  };
  if (typeof plugin[event] === 'function' && event) {
    pluginMethods[plugin.name][event] = plugin[event];
  }
  return pluginMethods;
}

export function getPluginMethods() {
  return pluginMethods;
}
export function abort(abortWasCalled: { value: boolean }) {
  return (message: string) => {
    abortWasCalled.value = true;
    return {
      abort: true,
      message
    };
  };
}

export const clearPluginAbortEventsAction = createAction('clearAbortableEvents');
export const enablePluginAction = createAction(EVENTS.enablePlugin);
export const disabledPluginAction = createAction(EVENTS.disablePlugin);
export const resetPluginAction = createAction(EVENTS.reset);

const pluginReducerBase = {
  [clearPluginAbortEventsAction.type]: (state) => {
    state.abortableEvents = {};
  },

  [enablePluginAction.type]: (state, action: PayloadAction<string[] | string>) => {
    const pluginNames = action.payload;
    if (pluginNames === state.name || pluginNames.includes(state.name)) state.enabled = true;
  },
  [disabledPluginAction.type]: (state, action: PayloadAction<string[] | string>) => {
    const pluginNames = action.payload;
    if (pluginNames === state.name || pluginNames.includes(state.name)) state.enabled = false;
  },

  [resetPluginAction.type]: (state) => {
    state = createPluginState(state.name, true, state.initilized, state.config);
  }
};
/**
 * A a plugin lifecycle event will remove all plugin lifecycle events from analytics
 * after the currect lifeycle is over, and before the next lifecycle starts
 */
/**
 A a plugin lifecycle event will remove all plugin lifecycle events from analytics
 * after the currect lifeycle is over, and before the next lifecycle starts. The actual
 * removal is triggered by the next event called after this lifecycle is over, and no triggered
 * by the end of the lifecycle
 * @param event
 * @param state 
 * @param reducer 
 * @param reducerOptions 
 */
export function abortableReducer(event: string, state, reducer, reducerOptions) {
  if (typeof reducer !== 'function') {
    throw new TypeError(`reducer ${reducer} is not a valid function`);
  }

  let wasAborted = {
    value: false
  };
  const abortedResult = reducer({ ...reducerOptions, abort: abort(wasAborted) });

  if (wasAborted.value && !abortedResult.abort) {
    throw new Error('abort was called but not returned. Please call abort in order to facilitate it');
  }

  if (abortedResult && abortedResult.abort) {
    state.abortableEvents[event] = true;
  }
}

const getDisabledPluginEvents = (action: PayloadAction<{ options: { disabledPlugins: Record<string, boolean> } }>) => {
  if (!Boolean(action.payload && action.payload.options)) {
    return [];
  }
  return action.payload.options.disabledPlugins
    ? Object.entries(action.payload.options.disabledPlugins).reduce((disabledPlugins, [key, value]) => {
        if (value) {
          disabledPlugins.push(key);
        }
        return disabledPlugins;
      }, [])
    : [];
};

/**
 *
 * @param plugin the plugin who's redcuers the function will create
 * @param instance The analytics instance the plugin will be hoisted onto
 * @returns the plugin reducer in an object and the initial state of the plugin
 */
export function createCorePluginReducer(plugin: Plugin, instance: AnalyticsInstance) {
  const { name, enabled, initialize, loaded, config } = plugin;
  const pluginInitialState = createPluginState(name, enabled, initialize, config);
  const pluginCoreReducer = CORE_LIFECYLCE_EVENTS.reduce((completeReducer, event) => {
    const genericPluginReducer = (state: PluginProcessedState = pluginInitialState, action: PayloadAction<any>) => {
      if ([EVENTS.initialize, EVENTS.initializeStart].includes(action.type)) {
        if (!pluginMethods[plugin.name]?.[event]) updatePluginMethodsEvents(plugin, event);
        abortableReducer(event, state, plugin[event], {
          payload: action.payload,
          config,
          instance
        });
      }

      const disabledPluginsOnSingleEventCall = getDisabledPluginEvents(action);

      if (state.initialized && state.enabled && !disabledPluginsOnSingleEventCall.includes(name)) {
        if (!pluginMethods[plugin.name]?.[event]) updatePluginMethodsEvents(plugin, event);
        abortableReducer(event, state, plugin[event], {
          payload: action.payload,
          config,
          instance
        });
      }
    };

    const coreAction = coreActions[event];

    if (coreAction && plugin[event]) {
      if (!pluginMethods[plugin.name]?.[event]) updatePluginMethodsEvents(plugin, event);
      const initializeEndReducer = (state: PluginProcessedState = pluginInitialState, action: AnyAction) => {
        abortableReducer(event, state, plugin[event], {
          abort,
          payload: action.payload,
          config,
          instance
        });
        state.loaded = Boolean(loaded({ config }));
        state.initialized = true;
      };

      if (initialize && [EVENTS.initialize, EVENTS.initializeStart, EVENTS.initializeEnd].includes(coreAction.type)) {
        switch (coreAction.type) {
          case coreActions[EVENTS.initialize].type:
            // initilize is a boolean key. Therefore no function here
            completeReducer[`${coreAction.type}:${name}`] = genericPluginReducer;
            break;

          case coreActions[EVENTS.initializeStart].type:
            completeReducer[coreAction.type] = genericPluginReducer;
            completeReducer[`${coreAction.type}:${name}`] = genericPluginReducer;
            break;

          case coreActions[EVENTS.initializeEnd].type:
            completeReducer[coreAction.type] = initializeEndReducer;
            completeReducer[`${coreAction.type}:${name}`] = initializeEndReducer;
            break;
        }
        // return early so the reducer isn't overwritten through the event type key below
        return completeReducer;
      }

      completeReducer[coreAction.type] = genericPluginReducer;
      completeReducer[`${coreAction.type}:${plugin.name}`] = genericPluginReducer;
    }
    return completeReducer;
  }, pluginReducerBase as unknown as { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> });
  return { pluginCoreReducer, pluginInitialState };
}

export function createPluginSpecificReducers(plugin: Plugin, instance: AnalyticsInstance) {
  const { name, enabled, initialize, loaded, config, ...pluginProperties } = plugin;
  const pluginInitialState = createPluginState(name, enabled, initialize, config);
  return Object.keys(pluginProperties).reduce((reducer, property) => {
    if (!LIFECYLCE_EVENTS[property] && typeof plugin[property] === 'function' && plugin[property]) {
      if (!pluginMethods[plugin.name]?.[property]) updatePluginMethodsEvents(plugin, property);

      reducer[property] = (state: PluginProcessedState = pluginInitialState, action: PayloadAction<any>) => {
        const disabledPluginsOnSingleEventCall = getDisabledPluginEvents(action);
        if (!disabledPluginsOnSingleEventCall.includes(name)) {
          abortableReducer(property, state, plugin[property], {
            payload: action.payload,
            config,
            instance
          });
        }
      };
    }
    return reducer;
  }, {} as { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> });
}

export function createAllPluginReducers(
  plugin: Plugin,
  analytics: AnalyticsInstance,
  alterInitialState: PluginProcessedState = undefined
) {
  const { pluginCoreReducer, pluginInitialState } = createCorePluginReducer(plugin, analytics);
  const pluginSpecificReducers = createPluginSpecificReducers(plugin, analytics);

  const pluginReducers = {
    ...pluginCoreReducer,
    ...pluginSpecificReducers
  };

  return createReducer(alterInitialState ? alterInitialState : pluginInitialState, pluginReducers);
}
export function createRegisterPluginType(name: string) {
  return `registerPlugin:${name}`;
}

export const createPluginType = (prefix:string) => (name: string) => {
  return `${prefix}:${name}`;
}

export const createInitializePluginType = createPluginType('initializePlugin');

export const createReadyPluginType = createPluginType('readyPlugin');
