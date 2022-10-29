import { Action, AnyAction, CaseReducer, createAction, createReducer } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../../api';
import { CORE_LIFECYLCE_EVENTS, EVENTS, LIFECYLCE_EVENTS } from '../../core-utils';
import { Config, Plugin, PluginProcessedState } from './plugin.types';
import { coreActions } from '../store';

export const pluginMethods = {};

export const createPluginState = (name: string, enabled: boolean, config) =>
  ({
    name,
    enabled,
    initialized: false,
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

export function abortableReducer(event: string, state, reducer, reducerOptions) {
  if (typeof reducer !== 'function') {
    throw new TypeError(`reducer ${reducer} is not a valid function`);
  }

  let wasAbortable = {
    value: false
  };
  const wasAborted = reducer({ ...reducerOptions, abort: abort(wasAbortable) });

  if (wasAbortable.value) {
    throw new Error('abort was called but not not returned. Please call abort in order to facilitate it');
  }

  if (wasAborted && wasAborted.abort) {
    state.abortableEvents[event] = true;
  }
}

export function createCorePluginReducer(plugin: Plugin, instance: AnalyticsInstance) {
  const { name, enabled, initialize, loaded, config } = plugin;
  const pluginInitialState = createPluginState(name, enabled, config);
  const pluginCoreReducer = CORE_LIFECYLCE_EVENTS.reduce((completeReducer, event) => {
    const genericPluginReducer = (state: PluginProcessedState = pluginInitialState, action: AnyAction) => {
      if ([EVENTS.initialize, EVENTS.initializeStart].includes(action.type)) {
        updatePluginMethodsEvents(plugin, event);
        abortableReducer(event, state, plugin[event], {
          payload: action.payload,
          config,
          instance
        });
      }

      if (state.initialized && state.enabled) {
        updatePluginMethodsEvents(plugin, event);
        abortableReducer(event, state, plugin[event], {
          payload: action.payload,
          config,
          instance
        });
      }
    };

    const coreAction = coreActions[event];

    if (coreAction && plugin[event]) {
      updatePluginMethodsEvents(plugin, event);
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
  }, {} as { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> });

  pluginCoreReducer[clearPluginAbortEventsAction.type] = (state) => {
    state.abortableEvents = {};
  };
  return { pluginCoreReducer, pluginInitialState };
}

export function createPluginSpecificReducers(plugin: Plugin, instance: AnalyticsInstance) {
  const { name, enabled, initialize, loaded, config, ...pluginProperties } = plugin;
  const pluginInitialState = createPluginState(name, enabled, config);
  return Object.keys(pluginProperties).reduce((reducer, property) => {
    if (!LIFECYLCE_EVENTS[property] && typeof plugin[property] === 'function' && plugin[property]) {
      updatePluginMethodsEvents(plugin, property);
      reducer[property] = (state: PluginProcessedState = pluginInitialState, action: AnyAction) => {
        abortableReducer(property, state, plugin[property], {
          payload: action.payload,
          config,
          instance
        });
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
