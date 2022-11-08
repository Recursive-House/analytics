import { createAction, createSlice } from '@reduxjs/toolkit';
import { EVENTS } from '../../utils';

export const pageStartAction = createAction<PagePayload>(EVENTS.pageStart);
export const pageAction = createAction<PagePayload>(EVENTS.page);
export const pageEndAction = createAction<PagePayload>(EVENTS.pageEnd);

export interface PagePayload {
  properties: Record<string, string | number | unknown>;
  options: Record<string, any>;
  _callback?: Function;
  _context?: Function[] | Function;
}

const PAGE_PAYLOAD_INIT = {
  event: '',
  properties: {}
};

const pageSlice = createSlice({
  name: 'page',
  initialState: {
    last: PAGE_PAYLOAD_INIT,
    history: {} as PagePayload[]
  },
  reducers: {
    [pageAction.type]: (state, action) => {
      state.last = action.payload;
      state.history = [...state.history, action.payload];
    }
  }
});

export const { page } = pageSlice.actions;
export default pageSlice.reducer;

export const pageEvents = (payload: PagePayload = {} as PagePayload) => {
  const { _context, _callback, ...remainingPayloadProperties } = payload;
  return [
    pageStartAction(payload),
    page(payload),
    { ...pageEndAction(remainingPayloadProperties), _context, _callback }
  ];
};
