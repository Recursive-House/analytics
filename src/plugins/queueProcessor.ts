import { Action, AnyAction, Dispatch, Middleware, MiddlewareAPI, ThunkDispatch } from "@reduxjs/toolkit";
import queue, { processQueueAction, updateQueue } from "../store/queue";
import { RootState } from "../store/store";


export const queueProcessorMiddleware: Middleware = <S extends RootState,
    D extends ThunkDispatch<S, undefined, AnyAction>,
>(store: MiddlewareAPI<D, S>) => (next: Dispatch) => (action: Action) => {

    const queue = store.getState().queue.actions;
    
    switch (action.type) {
        case processQueueAction.type:
            if (queue.length) {
                const writableQueue = [...queue];
                const queueItem = writableQueue.shift() as Action;
                next(action);
                store.dispatch(queueItem);
                store.dispatch(updateQueue(writableQueue));
                store.dispatch(processQueueAction());
            }
            return;

        default:
            if (!(queue.length || processQueueAction.match(action.type))) {
                next(action);
                return store.dispatch(processQueueAction());
            }

    }

    return next(action);
}
