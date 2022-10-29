import { createAction } from '@reduxjs/toolkit';
import { EVENTS } from '../core-utils';
import pluginReducer from './plugins/plugin';
import queueReducer from './queue';
import trackReducer from './track';

export const readyAction = createAction(EVENTS.ready);

const readyReducer = (state = false, action) => {
  switch (action.type) {
    case readyAction.type:
      state = true;
      return state;
  }
  return state;
};

export const coreReducers = {
  track: trackReducer,
  queue: queueReducer,
  plugin: pluginReducer,
  ready: readyReducer,
  lastAction: (state, action) => (state = action)
};

export const CORE_REDUCER_KEYS = Object.keys(coreReducers)
.reduce((keyMap, key) => {
  keyMap[key] = true;
  return keyMap;
}, {} as Record<string, boolean> );

export let reducerStore = {
  ...coreReducers
};

export function updateReducerStore(reducers) {
  reducerStore = reducers;
}


export function getReducerStore() {
  return reducerStore;
}
