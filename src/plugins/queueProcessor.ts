import { Action, AnyAction, Dispatch, Middleware, MiddlewareAPI, ThunkDispatch } from "@reduxjs/toolkit";
import { processQueue, Queue } from "../store/queue";
import { RootState } from "../store/store";


export const queueProcessorMiddleware: Middleware = <S extends RootState, D extends ThunkDispatch<S, undefined, AnyAction>>(store: MiddlewareAPI<D, S>) => (next: Dispatch) => (action: Action) => {
    switch (action.type) {
        case Queue.processQueue:
            const queue = store.getState().queue.actions;
            if (queue.length) {
                const queueItem = queue.shift() as Action;
                store.dispatch(queueItem);
                store.dispatch(dispatch => dispatch(processQueue()));
            }
    }
    next(action);
}
