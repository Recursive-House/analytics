
import { Action, AnyAction, CaseReducer, PayloadAction } from "@reduxjs/toolkit";
import { AnalyticsInstance } from "../api";
import { CORE_LIFECYLCE_EVENTS, EVENTS, LIFECYLCE_EVENTS } from "../core-utils";
import { Plugin, PluginProcessedState } from "./plugin.types";
import { coreActions } from "./store";


export function createCorePluginReducer(plugin: Plugin, instance: AnalyticsInstance) {
    const { name, enabled, initialize, loaded, config } = plugin;
    const pluginInitialState: PluginProcessedState = {
        isPlugin: true,
        name,
        enabled,
        initialized: false,
        loaded: false,
        config
    }
    const pluginCoreReducer = CORE_LIFECYLCE_EVENTS.reduce((completeReducer, event) => {

        const genericPluginReducer = (state: PluginProcessedState, action: AnyAction) => {
            if ([
                EVENTS.initialize,
                EVENTS.initializeStart].includes(action.type)) {
                plugin[event]({ payload: action.payload, config, instance, state });
            }

            if (state.initialized && state.enabled) {
                plugin[event]({ payload: action.payload, config, instance, state });
            }
        }

        const coreAction = coreActions[event];

        if (coreAction) {
            const initializeEndReducer = (
                state: PluginProcessedState,
                action: AnyAction
            ) => {
                plugin[coreAction.type]({ payload: action.payload, config, instance, state });
                state.loaded = Boolean(loaded({ config }));
                state.initialized = true;
            }
            if (initialize && [
                EVENTS.initialize,
                EVENTS.initializeStart,
                EVENTS.initializeEnd].includes(coreAction.type)) {
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
    return { pluginCoreReducer, pluginInitialState };
}

export function createPluginSpecificReducers(plugin: Plugin, instance: AnalyticsInstance) {
    const { name, enabled, initialize, loaded, config, ...pluginProperties } = plugin;
    return Object.keys(pluginProperties).reduce((reducer, property) => {
        if (!LIFECYLCE_EVENTS[property] && typeof plugin[property] === 'function') {
            reducer[property] = (state: PluginProcessedState, action: AnyAction) => plugin[property](
                {
                    payload: action.payload,
                    config,
                    instance,
                    state
                });
        }
        return reducer;
    }, {});
}

export function createRegisterPluginType(name: string) {
    return `registerPlugin:${name}`;
}

export function createInitializePluginType(name: string) {
    return `initializePlugin:${name}`;
}
