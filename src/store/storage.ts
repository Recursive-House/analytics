import { createAction, createSlice } from "@reduxjs/toolkit";
import { EVENTS } from "../utils";

export interface StoragePayload {
    storage: any;
}

export const setItemStartAction = createAction<StoragePayload>(EVENTS.setItemStart);
export const setItemAction = createAction<StoragePayload>(EVENTS.setItem);
export const setItemEndAction = createAction<StoragePayload>(EVENTS.setItemEnd);

export const removeItemStartAction = createAction<StoragePayload>(EVENTS.removeItemStart);
export const removeItemAction = createAction<StoragePayload>(EVENTS.removeItem);
export const removeItemEndAction = createAction<StoragePayload>(EVENTS.removeItemEnd);

const storage = createSlice({
    name: 'storage',
    initialState: {},
    reducers: {
        [EVENTS.setItem]: (_, action) => {
            const { storage } = action.payload;
            storage.setItem(action.payload.key, action.payload.value);
        },
        [EVENTS.removeItem]: (_, action) => {
            const { storage } = action.payload;
            storage.removeItem(action.payload.key, action.payload.value);
        }
    }
});

export const { setItem, removeItem } = storage.actions;
export default storage.reducer;

export const setItemEvents = (payload: StoragePayload = {} as StoragePayload) => {
    return [
        setItemStartAction(payload),
        setItem(payload),
        setItemEndAction(payload)
    ]
}

export const removeItemEvents = (payload: StoragePayload = {} as StoragePayload) => {
    return [
        removeItemStartAction(payload),
        removeItem(payload),
        removeItemEndAction(payload)
    ]
}
