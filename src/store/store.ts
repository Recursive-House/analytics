import { Action, CaseReducer, createAction, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../api';
import { CORE_EVENTS, EVENTS } from '../utils';
import { coreReducers } from './reducers';
import { setItemStartAction } from './storage';
import { track, trackEndAction, trackStartAction } from './track';

export const initializeStartAction = createAction<AnalyticsInstance>(EVENTS.initializeStart);
export const initializeAction = createAction<AnalyticsInstance>(EVENTS.initialize);
export const initializeEndAction = createAction<AnalyticsInstance>(EVENTS.initializeEnd);

export const initializeEvents = (payload?) => [
  initializeStartAction(payload),
  initializeAction(payload),
  initializeEndAction(payload)
];

export const coreActions = {
  [EVENTS.trackStart]: trackStartAction,
  [EVENTS.track]: track,
  [EVENTS.trackEnd]: trackEndAction,
  [EVENTS.initializeStart]: initializeStartAction,
  [EVENTS.initialize]: initializeAction,
  [EVENTS.initializeEnd]: initializeEndAction,
  [EVENTS.setItemStart]: setItemStartAction
};

export let abortedEventStore: Record<string, boolean> = {};
export let removedEventsStore: Record<string, boolean> = {};

export const getAbortedEvents = (event: keyof typeof EVENTS | string) => {
  return abortedEventStore[event];
};

export const setAbortedEvents = (event: keyof typeof EVENTS | string, value: boolean) => {
  abortedEventStore[event] = value;
  return value;
};

export const getAllAbortedEvents = () => {
  return abortedEventStore;
};

export const resetAbortedEvents = () => {
  abortedEventStore = {};
};

export const getRemovedEvents = (event: keyof typeof EVENTS | string) => {
  return removedEventsStore[event];
};

export const setRemovedEvents = (event: keyof typeof EVENTS | string, value: boolean) => {
  removedEventsStore[event] = value;
  console.log('event', removedEventsStore);
  return value;
};

export const getAllRemovedEvents = () => {
  return removedEventsStore;
};

export const resetRemovedEvents = () => {
  return removedEventsStore = {};
};


export interface StoreExtension {
  enqueue: (
    actions: PayloadAction<any> | PayloadAction<any>[] | Function[] | (PayloadAction<any> | Function)[]
  ) => PayloadAction;
}

export type CaseReducers<S, AS extends Action> = {
  [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : void;
};

export type RootState = {
  [K in keyof typeof coreReducers]: ReturnType<typeof coreReducers[K]>;
};
