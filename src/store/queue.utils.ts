import { Action, CaseReducer, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import { AnalyticsInstance } from 'src/api';
import { abortAction } from '../plugins/queueProcessor';
import { clearPluginAbortEventsAction, createAllPluginReducers, getPluginMethods } from './plugins';
import { enqueue, QueueAction } from './queue';
import { CORE_REDUCER_KEYS, getReducerStore } from './reducers';
import { RootState } from './store';

export function collectAbortedEvents(globalState: RootState) {
  const abortableEventStates = Object.keys(globalState).reduce((pluginAbortState, stateKey) => {
    if (CORE_REDUCER_KEYS[stateKey]) {
      return pluginAbortState;
    }
    return (
      (pluginAbortState[stateKey] = globalState[stateKey].abortableEvents ? globalState[stateKey].abortableEvents : {}),
      pluginAbortState
    );
  }, {});

  return new Set(
    ...Object.keys(abortableEventStates).map((pluginStateKey) => Object.keys(abortableEventStates[pluginStateKey]))
  );
}

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

export function getAbortedPluginReducers(
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

export function replaceAbortedReducer(store: EnhancedStore<any, any, any>, analytics: AnalyticsInstance) {
  const collectedAbortedEvents = collectAbortedEvents(store.getState());
  if (collectedAbortedEvents.size) {
    const pluginReducers = getAbortedPluginReducers(store, analytics, collectedAbortedEvents);
    store.replaceReducer(combineReducers({ ...getReducerStore(), ...pluginReducers }));
    store.dispatch(clearPluginAbortEventsAction());
  }
}

export function abortSensitiveQueue(store: EnhancedStore<any, any, any>, analytics: AnalyticsInstance) {
  return (actions: QueueAction) => {
    if (Array.isArray(actions) || typeof actions === 'function') {
      replaceAbortedReducer(store, analytics);
      return enqueue(actions);
    }

    switch (actions.type) {
      case abortAction.type:
        return enqueue(actions);
      default:
        replaceAbortedReducer(store, analytics);
        return enqueue(actions);
    }
  };
}
