import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum Queue {
  enqueue = 'enqueue',
  processQueue = 'processQueue',
  updateQueue = 'updateQueue'
}

export const processQueueAction = createAction(Queue.processQueue);

export type QueueAction = PayloadAction<any> | PayloadAction<any>[];

const queueSlice = createSlice({
  name: 'queue',
  initialState: {
    actions: [] as (Function | PayloadAction<any>)[]
  },
  reducers: {
    [Queue.enqueue]: (state, action: PayloadAction<QueueAction>) => {
      if (Array.isArray(action.payload)) {
        state.actions = [...state.actions, ...action.payload];
      } else {
        state.actions.push(action.payload);
      }
    },
    [Queue.updateQueue]: (state, action: PayloadAction<(Function | PayloadAction<any>)[]>) => {
      state.actions = action.payload;
    }
  }
});

export const { enqueue, updateQueue } = queueSlice.actions;

export default queueSlice.reducer;
