import { Action, CaseReducer, createAction, PayloadAction, ReducersMapObject } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../api';
import { EVENTS } from '../core-utils';
import { coreReducers } from './reducers';
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
  [EVENTS.initializeEnd]: initializeEndAction
};

export interface StoreExtension {
  enqueue: (
    actions: PayloadAction<any> | PayloadAction<any>[] | Function[] | (PayloadAction<any> | Function)[]
  ) => PayloadAction;
}

export type CaseReducers<S, AS extends Action> = {
  [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : void;
}

export type RootState = {
  [K in keyof typeof coreReducers]: ReturnType<typeof coreReducers[K]>;
};
