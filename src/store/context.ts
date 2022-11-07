import { createSlice } from "@reduxjs/toolkit";
import { EVENTS } from "../utils";

const contextSlice = createSlice({
    name: 'context',
    initialState: {
        online: false
    },
    reducers: {
        [EVENTS.online]: (state) => {
            state.online = true;
        },
        [EVENTS.offline]: (state) => {
            state.online = false
        }
    }
});

export const { online, offline } = contextSlice.actions;

export default contextSlice.reducer;