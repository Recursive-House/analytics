import {
  createAction,
  Dispatch,
  Middleware,
  MiddlewareAPI,
  PayloadAction,
  ReducersMapObject,
  ThunkDispatch
} from '@reduxjs/toolkit';
import { EVENTS } from '../core-utils';
import { processQueueAction, updateQueue } from '../store/queue';
import { RootState, StoreExtension } from '../store/store';

export interface AbortPayload {
  pluginEvent: string;
}

export const abortAction = createAction(EVENTS.abort);

export const queueProcessorMiddleware: Middleware =
  <
    S extends RootState,
    D extends ThunkDispatch<S, undefined, PayloadAction<any>>
  >(
    store: MiddlewareAPI<D, S> &
      StoreExtension & {
        replaceReducer: (nextReducer: ReducersMapObject<RootState>) => void;
      }
  ) =>
  (next: Dispatch) =>
  (action: PayloadAction<any>) => {
    const queue = store.getState().queue.actions;
    switch (action.type) {
      case processQueueAction.type:
        if (queue.length) {
          const writableQueue = [...queue];
          const queueItem = writableQueue.shift() as PayloadAction;
          next(action);
          store.dispatch(queueItem);
          store.dispatch(updateQueue(writableQueue));
          store.dispatch(processQueueAction());
        }
        return;

      default:
        if (!(queue.length || processQueueAction.match(action))) {
          next(action);
          return store.dispatch(processQueueAction());
        }
    }

    return next(action);
  };
