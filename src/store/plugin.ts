import { Action, AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Plugin, PluginProcessedState } from "./plugin.types";
import { AnalyticsInstance, AnalyticsModule } from '../api';
import { EVENTS } from "../core-utils";


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
} & { pluginAmmount: number };

const pluginSlice = createSlice({
    name: 'plugin',
    initialState: {
    } as PluginReducerState,
    reducers: {
        [EVENTS.initializeEnd]: (
            state: PluginReducerState,
            // can't use store state type definition because of crcular depenedency
            action: PayloadAction<{ instance: AnalyticsInstance }>
        ) => {
            const globalState = action.payload.instance.getState();
            console.log(globalState);


        }
    },
    extraReducers: (builder) => {
        builder
            .addMatcher(isRegisterPluginEvent, (state, action) => {
                const { name } = action.payload.plugin;
                state[name] = action.payload.plugin;
            })
            // .addMatcher()
    }
})

export default pluginSlice.reducer;