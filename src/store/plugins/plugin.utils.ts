import { Action, AnyAction, CaseReducer, createAction, createReducer } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../../api';
import { CORE_LIFECYLCE_EVENTS, EVENTS, LIFECYLCE_EVENTS } from '../../core-utils';
import { Plugin, PluginProcessedState } from './plugin.types';
import { coreActions } from '../store';

const pluginMethods = {};

export function updatePluginMethodsEvents(plugin: Plugin, event: string) {
  pluginMethods[plugin.name] = {
    ...(pluginMethods[plugin.name] || {})
  };
  if (typeof plugin[event] === 'function' && event) {
    pluginMethods[plugin.name][event] = plugin[event];
  }
}

export function getPluginMethods() {
  return pluginMethods;
}
export function abort(message: string) {
  return {
    abort: true,
    message
  };
}

export const clearPluginAbortEventsAction = createAction('clearAbortableEvents');

function abortabledReducer(event, state, reducer, reducerOptions) {
  const wasAborted = reducer(reducerOptions);

  if (wasAborted && wasAborted.abort) {
    state.abortableEvents[event] = true;
  }
}

export function createCorePluginReducer(plugin: Plugin, instance: AnalyticsInstance) {
  const { name, enabled, initialize, loaded, config } = plugin;
  const pluginInitialState: PluginProcessedState = {
    isPlugin: true,
    name,
    enabled,
    initialized: false,
    loaded: false,
    abortableEvents: {},
    config
  };
  const pluginCoreReducer = CORE_LIFECYLCE_EVENTS.reduce(
    (completeReducer, event) => {
      const genericPluginReducer = (state: PluginProcessedState = pluginInitialState, action: AnyAction) => {
        if ([EVENTS.initialize, EVENTS.initializeStart].includes(action.type)) {
          updatePluginMethodsEvents(plugin, event);
          abortabledReducer(event, state, plugin[event], {
            abort,
            payload: action.payload,
            config,
            instance
          });
        }

        if (state.initialized && state.enabled) {
          updatePluginMethodsEvents(plugin, event);
          abortabledReducer(event, state, plugin[event], {
            abort,
            payload: action.payload,
            config,
            instance
          });
        }
      };

      const coreAction = coreActions[event];

      if (coreAction && plugin[coreAction.type]) {
        updatePluginMethodsEvents(plugin, event);
        const initializeEndReducer = (state: PluginProcessedState = pluginInitialState, action: AnyAction) => {
          abortabledReducer(event, state, plugin[coreAction.type], {
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
    },
    {} as { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>> }
    // as {
    //   [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginProcessedState, Action<any>>;
    // } & { clearPluginAbortEvents: CaseReducer<PluginProcessedState, Action<any>> }
  );

  pluginCoreReducer[clearPluginAbortEventsAction.type] = (state) => {
    state.abortableEvents = {};
  };
  return { pluginCoreReducer, pluginInitialState };
}

export function createPluginSpecificReducers(plugin: Plugin, instance: AnalyticsInstance) {
  const { name, enabled, initialize, loaded, config, ...pluginProperties } = plugin;
  const pluginInitialState: PluginProcessedState = {
    isPlugin: true,
    name,
    enabled,
    initialized: false,
    loaded: false,
    abortableEvents: {},
    config
  };
  return Object.keys(pluginProperties).reduce((reducer, property) => {
    if (!LIFECYLCE_EVENTS[property] && typeof plugin[property] === 'function' && plugin[property]) {
      updatePluginMethodsEvents(plugin, property);
      reducer[property] = (state: PluginProcessedState = pluginInitialState, action: AnyAction) => {
        abortabledReducer(property, state, plugin[property], {
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
