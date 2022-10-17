import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EVENTS } from '../core-utils';

export interface TrackPayload {
  event: string;
  properties: Record<string, string | number | unknown>;
  options: unknown;
}

const TRACK_PAYLOAD_INIT = {
  event: '',
  properties: {},
}

export const trackStartAction = createAction<TrackPayload>(EVENTS.trackStart);
export const trackAction = createAction<TrackPayload>(EVENTS.track);
export const trackEndAction = createAction<TrackPayload>(EVENTS.trackEnd);

const trackSlice = createSlice({
  name: 'track',
  initialState: {
    last: TRACK_PAYLOAD_INIT,
    history: [] as TrackPayload[],
  },
  reducers: {
    [trackAction.type]: (state, action: PayloadAction<TrackPayload>) => {
      state.last = action.payload;
      state.history = [...state.history, action.payload];
    }
  },
})


export const { track } = trackSlice.actions
export default trackSlice.reducer;

export const trackEvents = (payload: TrackPayload) => [
  trackStartAction(payload),
  track(payload),
  trackEndAction(payload)
];