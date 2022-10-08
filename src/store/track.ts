import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EVENTS } from '../core-utils';

export interface TrackPayload {
    event: string;
    properties: string;
    options: unknown;
}

const TRACK_PAYLOAD_INIT = {
    event: '',
    properties: {},
}

const trackSlice = createSlice({
    name: 'track',
    initialState: {
      last: TRACK_PAYLOAD_INIT,
      history: [] as TrackPayload[],
    },
    reducers: {
      [EVENTS.track]: (state, action: PayloadAction<TrackPayload>) => { 
        state.last = action.payload;
        state.history = state.history.concat(action.payload);
      }
    },
  })
  
  export const { track } = trackSlice.actions
  export default trackSlice.reducer;