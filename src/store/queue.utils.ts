import { Action, CaseReducer, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import { AnalyticsInstance } from 'src/api';
import { abortAction } from '../plugins/queueProcessor';
import { createAllPluginReducers, getPluginMethods } from './plugins';
import { enqueue, QueueAction } from './queue';
import { getReducerStore } from './reducers';
import { getAllRemovedEvents } from './store';

export function getDeletedReducers<S, AS extends Action>(collectedAbortedEvents: Set<string>) {
  const reducers = { ...getPluginMethods() };

  return Object.keys(reducers).reduce(
    (result, key) => {
      const reducer = { ...reducers[key] };

      result[key] = Array.from(collectedAbortedEvents).reduce((abortedEvent) => {
        if (!reducer[abortedEvent]) {
          new Error(`${abortedEvent} does not exist in ${key} reducer`);
        }
        delete reducer[abortedEvent];
        return reducer;
      }, reducer);
      return result;
    },
    {} as {
      [T in keyof AS]: CaseReducer;
    }
  );
}

export function getDeletedPluginReducers(
  store: EnhancedStore<any, any, any>,
  analytics: AnalyticsInstance,
  collectedAbortedEvents: Set<string>
) {
  const deletedReducersMap = getDeletedReducers(collectedAbortedEvents);
  const analyticsState = store.getState();
  const pluginStates = Object.keys(deletedReducersMap).reduce(
    (allPluginStates, pluginName) => ((allPluginStates[pluginName] = analyticsState[pluginName]), allPluginStates),
    {}
  );
  return Object.keys(deletedReducersMap).reduce((result, key) => {
    result[key] = createAllPluginReducers({ ...deletedReducersMap[key], name: key }, analytics, pluginStates[key]);
    return result;
  }, {});
}

export function replaceDeletedReducer(store: EnhancedStore<any, any, any>, analytics: AnalyticsInstance) {
  const collectedAbortedEvents = new Set(Object.keys(getAllRemovedEvents()));
  if (collectedAbortedEvents.size) {
    const pluginReducers = getDeletedPluginReducers(store, analytics, collectedAbortedEvents);
    store.replaceReducer(combineReducers({ ...getReducerStore(), ...pluginReducers }));
  }
}

export function deleteSensitiveQueue(store: EnhancedStore<any, any, any>, analytics: AnalyticsInstance) {
  return (actions: QueueAction) => {
    if (Array.isArray(actions) || typeof actions === 'function') {
      replaceDeletedReducer(store, analytics);
      return enqueue(actions);
    }

    switch (actions.type) {
      case abortAction.type:
        return enqueue(actions);
      default:
        replaceDeletedReducer(store, analytics);
        return enqueue(actions);
    }
  };
}
