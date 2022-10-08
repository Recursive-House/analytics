import { AnyAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EVENTS, LIFECYLCE_EVENT_KEYS } from "../core-utils";


type LifeCycleEvent = ({ payload, config, instance }) => void;

export type Plugin = { [K in LIFECYLCE_EVENT_KEYS]: LifeCycleEvent };

export interface PluginState {
    enabled: boolean;
    initialized: boolean;
    loaded: boolean;
}

function isRegisterPluginEvent(
    action: AnyAction
): action is PayloadAction<PluginState> {
    return /^registerPlugin:([^:]*)$/.test(action.type);
}

function isInitializePluginEvent(
    action: AnyAction
): action is PayloadAction<PluginState> {
    return /^initializePlugin:([^:]*)$/.test(action.type);
}

// check if this really works well
export function getNameFromPluginEvent(event: string) {
    return event.split(':')[1];
}

export default function createPluginsReducer(getPlugins: () => { [key: string]: Plugin }) {
    return createSlice({
        name: 'plugins',
        initialState: {} as { [key: string]: PluginState },
        reducers: {},
        extraReducers: (builder) => {
            builder.addMatcher(isRegisterPluginEvent, (state, action) => {
                const { enabled } = action.payload;
                const name = getNameFromPluginEvent(action.type);
                const plugin = getPlugins()[name];
                if (plugin && name) {
                    state[name] = {
                        enabled,
                        // set initialized to true if initialize method is missing
                        initialized: enabled ? Boolean(!plugin.initialize) : false,
                        // should call loaded function if enabled
                        loaded: enabled ? true : false
                    }
                }
            })
            .addMatcher(isInitializePluginEvent, (state, action) => {
                const { enabled } = action.payload;
                const name = getNameFromPluginEvent(action.type);
                const plugin = getPlugins()[name];
                if (plugin && name) {
                    state[name].initialized = true;
                    // loaded function should change loaded state
                    // state[name].loaded = loaded
                }

                
            })
        }
    })
}

