import { Action, AnyAction, CaseReducer, createAction } from "@reduxjs/toolkit";
import { coreActions } from "../store/store";
import { AnalyticsInstance } from "../api";
import { CORE_LIFECYLCE_EVENTS } from "../core-utils";
import { Plugin, PluginReducerState } from "../store/plugins";

export function createCorePluginReducer(plugin: Plugin, instance: AnalyticsInstance) {
    const { name, enabled, initialize, loaded, config } = plugin;
    const pluginInitialState: PluginReducerState = {
        name,
        enabled,
        initialized: initialize,
        loaded: Boolean(loaded({ config })),
        config
    }
    const pluginCoreReducer = CORE_LIFECYLCE_EVENTS.reduce((reducerSetup, event) => {
        const coreAction = coreActions[event];
        if (coreAction) {
            reducerSetup[coreAction.type] = (state: PluginReducerState, action: AnyAction) => {
                plugin[event]({ payload: action.payload, config, instance, state });
            }
            reducerSetup[`${plugin.name}:${event}`] = (state: PluginReducerState, action: AnyAction) => {
                plugin[event]({ payload: action.payload, config, instance, state });
            }
        }
        return reducerSetup;
    }, {} as { [K in keyof typeof CORE_LIFECYLCE_EVENTS]: CaseReducer<PluginReducerState, Action<any>> });
    return { pluginCoreReducer, pluginInitialState };
}

export const createPluginMidleware = (plugin: Plugin) => {

}