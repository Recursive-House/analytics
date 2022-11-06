import { configureStore } from '@reduxjs/toolkit';
import {
  coreReducers,
  enqueue,
  processQueueAction,
  trackAction,
  trackEndAction,
  trackEvents,
  trackStartAction,
  updateQueue
} from '../store';
import { queueProcessorMiddleware } from './queueProcessor';

describe('queueProcessor', () => {
  let store;
  let queueMiddleware;

  const trackPayload = {
    event: 'forEvent',
    properties: { prop: 'value' },
    options: {}
  };

  beforeEach(() => {
    store = configureStore({
      reducer: { ...coreReducers },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        }).concat(queueProcessorMiddleware)
    });
    queueMiddleware = queueProcessorMiddleware(store)(() => ({ type: 'fakeAction', random: 'rst' } as any));
  });
  it("shouldn't stop processing the queue until the queue is empty", () => {
    let lastQueue;
    store.subscribe(() => {
      const action = store.getState().lastAction;

      if (updateQueue.match(action)) {
        lastQueue = action.payload;
      }
      if (processQueueAction.match(action)) {
        expect(lastQueue.length).not.toBe(0);
      }
    });
    store.dispatch(updateQueue(trackEvents({ ...trackPayload })));
  });
  it("shouldn't process if the queue is empty", () => {
    jest.spyOn(store, 'getState').mockReturnValue({
      queue: {
        actions: []
      }
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    const queueResult = queueMiddleware(processQueueAction);
    expect(dispatchSpy).not.toBeCalled();
    expect(queueResult).toBeFalsy();
  });

  // store.dispatch.mock.calls.length stays the same size at 1. Doesn't grow with number of calls
  //
  //   it("shouldn't process items out of the order they enter the queue", () => {
  //     store.dispatch = jest.fn(store.dispatch);
  //     store.subscribe(() => {
  //         console.log('last action', store.getState().lastAction);
  //       const queueSize = store.getState().queue.actions.length;
  //       console.log(queueSize, "size", store.dispatch.mock.calls.length);
  //       if (!queueSize && store.dispatch.mock.calls.length !== 0) {
  //         console.log('got here at all');
  //         const trackCallOrder = store.dispatch.mock.calls.reduce((result, call, index) => {
  //           console.log(call);
  //           if (call[0].payload) {
  //             result[call[0].payload.type] = index;
  //             return result;
  //           }
  //           return result;
  //         }, {});
  //         console.log(trackCallOrder);
  //         expect(trackCallOrder[trackAction.type]).not.toBeLessThan(trackCallOrder[trackStartAction.type]);
  //         expect(trackCallOrder[trackEndAction.type]).not.toBeLessThan(trackCallOrder[trackAction.type]);
  //       }
  //     });
  //     store.dispatch(enqueue(trackEvents({ ...trackPayload })));
  //   });
});
