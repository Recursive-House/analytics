import { Action, CaseReducer, createAction, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../api';
import { EVENTS } from '../utils';
import {
  identify,
  identifyStartAction,
  identifyEndAction,
  resetStartAction,
  resetAction,
  resetEndAction
} from './identity';
import { page, pageStartAction } from './page/page';
import { coreReducers } from './reducers';
import {
  removeItem,
  removeItemStartAction,
  setItem,
  setItemEndAction,
  setItemStartAction
} from './storage';
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
  [EVENTS.initializeStart]: initializeStartAction,
  [EVENTS.initialize]: initializeAction,
  [EVENTS.initializeEnd]: initializeEndAction,
  [EVENTS.trackStart]: trackStartAction,
  [EVENTS.track]: track,
  [EVENTS.trackEnd]: trackEndAction,
  [EVENTS.setItemStart]: setItemStartAction,
  [EVENTS.identifyStart]: identifyStartAction,
  [EVENTS.identify]: identify,
  [EVENTS.identifyEnd]: identifyEndAction,
  [EVENTS.resetStart]: resetStartAction,
  [EVENTS.reset]: resetAction,
  [EVENTS.resetEnd]: resetEndAction,
  [EVENTS.pageStart]: pageStartAction,
  [EVENTS.page]: page,
  [EVENTS.pageEnd]: pageStartAction,
  [EVENTS.setItemStart]: setItemStartAction,
  [EVENTS.setItem]: setItem,
  [EVENTS.setItemEnd]: setItemEndAction,
  [EVENTS.removeItemStart]: removeItemStartAction,
  [EVENTS.removeItem]: removeItem,
  [EVENTS.resetStart]: resetStartAction,
  [EVENTS.reset]: resetAction,
  [EVENTS.resetEnd]: resetEndAction,
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
  return value;
};

export const getAllRemovedEvents = () => {
  return removedEventsStore;
};

export const resetRemovedEvents = () => {
  return (removedEventsStore = {});
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
