import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsInstance } from '../api';
import { ANON_ID, ID, USER_ID, USER_TRAITS } from '../utils/constants';
import { EVENTS } from '../utils';
import { ANONID } from '../utils/utility';
import { remove } from '../utils/storage';
import { tempKey } from '../user/user';
import { v4 } from 'uuid';

export interface IdentifyPayload {
  userId: string;
  traits: Record<string, unknown>;
  analytics?: AnalyticsInstance;
  storage?: any;
  anonymousId: string;
  options?: Record<string, any>;
  _callback?: Function;
  _context?: Function[] | Function;
}

export interface ResetPayload {
  analytics: AnalyticsInstance;
  storage: any;
  _callback?: Function;
  _context?: Function[] | Function;
}

export interface IdentityOptions {
  plugins: {
    all?: boolean;
    [plugin: string]: boolean;
  };
}

const IDENTIFY_PAYLOAD_INIT = {
  event: '',
  properties: {}
};

export const identifyStartAction = createAction<IdentifyPayload>(EVENTS.identifyStart);
export const identifyAction = createAction<IdentifyPayload>(EVENTS.identify);
export const identifyEndAction = createAction<IdentifyPayload>(EVENTS.identifyEnd);

export const resetStartAction = createAction<ResetPayload>(EVENTS.resetStart);
export const resetAction = createAction<ResetPayload>(EVENTS.reset);
export const resetEndAction = createAction<ResetPayload>(EVENTS.resetEnd);

const identifySlice = createSlice({
  name: 'identify',
  initialState: {
    last: IDENTIFY_PAYLOAD_INIT,
    history: [] as IdentifyPayload[]
  },
  reducers: {
    [identifyAction.type]: (_, action: PayloadAction<IdentifyPayload>) => {
      const { setItem, getItem } = action.payload.storage;
      const { userId, traits } = action.payload;
      if (!getItem(ANON_ID)) {
        if (typeof window !== 'undefined') {
          setItem(ANON_ID, v4());
        } else {
          setItem(ANON_ID, v4());
        }
      }

      const currentTraits = getItem(USER_TRAITS) || {};
      if (userId) {
        setItem(USER_ID, userId);
      }
      if (traits) {
        setItem(USER_TRAITS, {
          ...currentTraits,
          ...traits
        });
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(EVENTS.reset, (state, action: PayloadAction<ResetPayload>) => {
      const { removeItem } = action.payload.storage;
      [USER_ID, USER_TRAITS, ANON_ID].forEach((key) => {
        removeItem(key);
      });
      [ID, ANONID, 'traits'].forEach((key) => {
        remove(tempKey(key));
      });
    });
  }
});

export const { identify } = identifySlice.actions;
export default identifySlice.reducer;

export const identifyEvents = (payload: IdentifyPayload = {} as IdentifyPayload) => {
  const { _context, _callback, ...remainingPayloadProperties } = payload;
  return [
    identifyStartAction(payload),
    identify(payload),
    { ...identifyEndAction(remainingPayloadProperties), _context, _callback }
  ];
};

export const resetEvents = (payload: ResetPayload) => {
  const { _context, _callback, ...remainingPayloadProperties } = payload;
  return [
    resetStartAction(payload),
    resetAction(payload),
    { ...resetEndAction(remainingPayloadProperties), _context, _callback }
  ];
};
