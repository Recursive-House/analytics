import { AnyAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Plugin, PluginProcessedState } from './plugin.types';
import { AnalyticsModule } from '../../api';

export function isRegisterPluginEvent(
  action: AnyAction
): action is PayloadAction<{ plugin: Plugin; state: PluginProcessedState }> {
  return /^registerPlugin:([^:]*)$/.test(action.type);
}

export function isInitializePluginEvent(
  action: AnyAction
): action is PayloadAction<{ instance: AnalyticsModule; plugin: Plugin }> {
  return /^initializePlugin:([^:]*)$/.test(action.type);
}

// check if this really works well
export function getNameFromPluginEvent(event: string) {
  const [_, pluginName] = event.split(':');
  return pluginName;
}

export type PluginReducerState = {
  [name: string]: Plugin;
};

const pluginSlice = createSlice({
  name: 'plugin',
  initialState: {} as PluginReducerState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(isRegisterPluginEvent, (state, action) => {
      const { name } = action.payload.plugin;
      state[name] = action.payload.plugin;
    });
    // .addMatcher()
  }
});

export default pluginSlice.reducer;
