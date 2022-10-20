import { Action, AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Plugin, PluginProcessedState } from "./plugin.types";
import { AnalyticsInstance, AnalyticsModule } from '../api';
import { EVENTS } from "../core-utils";
import { initializeEndAction } from "./store";


export function isRegisterPluginEvent(
    action: AnyAction
): action is PayloadAction<{ plugin: Plugin, state: PluginProcessedState }> {
    return /^registerPlugin:([^:]*)$/.test(action.type);
}

export function isInitializePluginEvent(
    action: AnyAction
): action is PayloadAction<{ instance: AnalyticsModule, plugin: Plugin }> {
    return /^initializePlugin:([^:]*)$/.test(action.type);
}

// check if this really works well
export function getNameFromPluginEvent(event: string) {
    const [_, pluginName] = event.split(':');
    return pluginName;
}

export type PluginReducerState = {
    [name: string]: Plugin
} & { initializationFinished: boolean };

const pluginSlice = createSlice({
    name: 'plugin',
    initialState: {
        initializationFinished: false,
    } as PluginReducerState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(initializeEndAction.type, (state, action: PayloadAction<{ appState: AnalyticsInstance }>) => {
                const { payload: { appState } } = action;
            })
            .addMatcher(isRegisterPluginEvent, (state, action) => {
                const { name } = action.payload.plugin;
                state[name] = action.payload.plugin;
            })
        // .addMatcher()
    }
})

export default pluginSlice.reducer;