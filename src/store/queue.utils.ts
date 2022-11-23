import { Action, CaseReducer, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import { AnalyticsInstance } from 'src/api';
import { abortAction } from '../plugins/queueProcessor';
import { clearPluginAbortEventsAction, createAllPluginReducers, getPluginMethods } from './plugins';
import { enqueue, QueueAction } from './queue';
import { CORE_REDUCER_KEYS, getReducerStore } from './reducers';
import { getAllRemovedEvents } from './store';

export function getAbortedReducers<S, AS extends Action>(collectedAbortedEvents: Set<string>) {
  const reducers = { ...getPluginMethods() };

  return Object.keys(reducers).reduce(
    (result, key) => {
      const reducer = { ...reducers[key] };

      Array.from(collectedAbortedEvents).forEach((abortedEvent) => {
        if (!reducer[abortedEvent]) {
          new Error(`${abortedEvent} does not exist in ${key} reducer`);
        }
        delete reducer[abortedEvent];
      });
      result[key] = reducer;
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
  const abortedReducersMap = getAbortedReducers(collectedAbortedEvents);
  const analyticsState = store.getState();
  const pluginStates = Object.keys(abortedReducersMap).reduce(
    (allPluginStates, pluginName) => ((allPluginStates[pluginName] = analyticsState[pluginName]), allPluginStates),
    {}
  );
  return Object.keys(abortedReducersMap).reduce((result, key) => {
    result[key] = createAllPluginReducers({ ...abortedReducersMap[key], name: key }, analytics, pluginStates[key]);
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
