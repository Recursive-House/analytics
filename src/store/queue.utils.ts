import {
  Action,
  AnyAction,
  CaseReducer,
  CaseReducers,
  combineReducers,
  EnhancedStore,
  PayloadAction,
  ReducersMapObject
} from '@reduxjs/toolkit';
import { abortAction, AbortPayload } from '../plugins/queueProcessor';
import { clearPluginAbortEventsAction, getPluginMethods } from './plugins';
import { enqueue, QueueAction } from './queue';
import { CORE_REDUCER_KEYS, getReducerStore } from './reducers';

export function collectAbortedEvents(globalState: any) {
  const abortableEventStates = Object.keys(globalState).reduce((pluginAbortState, stateKey) => {
    if (CORE_REDUCER_KEYS[stateKey]) {
      return pluginAbortState;
    }
    return (pluginAbortState[stateKey] = globalState[stateKey].abortableEvents, pluginAbortState);
  }, {});
  console.log('abortableEventStates', abortableEventStates);
  return new Set(
    ...Object.keys(abortableEventStates).map((pluginState) => Object.keys(abortableEventStates[pluginState]))
  );
}

export function getAbortedReducers<S, AS extends Action>(collectedAbortedEvents: Set<string>) {
  console.log('pluginMethods', getPluginMethods());
  const reducers = { ...getPluginMethods() };

  console.log('reducers', reducers);
  return Object.keys(reducers).reduce(
    (result, key) => {
      const reducer = { ...reducers[key] };

      Array.from(collectedAbortedEvents).forEach((abortedEvent) => {
        if (!reducer[abortedEvent]) {
          new Error(`${abortedEvent} does not exist in ${key} reducer`);
        }
        console.log('deleting event', abortedEvent, collectedAbortedEvents, reducer);
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

export function replaceAbortedReducer(store: EnhancedStore<any, any, any>) {
  console.log('replace aborted reducer called', store.getState());
  const collectedAbortedEvents = collectAbortedEvents(store.getState());
  if (collectedAbortedEvents.size) {
    const reducersAfterAbortProcessing = getAbortedReducers(collectedAbortedEvents);
    console.log('processing actions');
    console.log('reducersAfterAbortProcessing', reducersAfterAbortProcessing);
    console.log('found aborted events');
    store.dispatch(clearPluginAbortEventsAction());
    store.replaceReducer(combineReducers(reducersAfterAbortProcessing));
  }
}

export function abortSensitiveQueue(store: EnhancedStore<any, any, any>) {
  return (actions: QueueAction) => {
    if (Array.isArray(actions) || typeof actions === 'function') {
      replaceAbortedReducer(store);
      return enqueue(actions);
    }
    console.log('enqueue called');

    switch (actions.type) {
      case abortAction.type:
        console.log('abort action passed through');
        return enqueue(actions);
      default:
        replaceAbortedReducer(store);
        return enqueue(actions);
    }
  };
}