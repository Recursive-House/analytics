import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum Queue {
    enqueue = 'enqueue',
    processQueue = 'processQueue'
}

export const processQueue = createAction(Queue.processQueue)

const queueSlice = createSlice({
    name: 'queue',
    initialState: {
        actions: [] as PayloadAction<any>[],

    },
    reducers: {
        [Queue.enqueue]: (state, action: PayloadAction<PayloadAction<any> | PayloadAction<any>[]>) => {
            if (Array.isArray(action.payload)) {
                state.actions.concat(action.payload);
            } else {
                state.actions.push(action.payload);
            }
        }
    },
})

export const { enqueue } = queueSlice.actions
export default queueSlice.reducer;