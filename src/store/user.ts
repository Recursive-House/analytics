import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ANON_ID, USER_ID, USER_TRAITS } from '../utils/constants';
import { identifyAction, IdentifyPayload, resetAction } from './identity';

const userIntialState = () => ({
  userId: undefined,
  anonymousId: undefined,
  traits: {}
});

const userSlice = createSlice({
  name: 'user',
  initialState: {
    ...userIntialState()
  },
  reducers: {},
  extraReducers: {
    [identifyAction.type]: (state, action: PayloadAction<IdentifyPayload>) => {
      state.userId = action.payload.userId;
      state.anonymousId = action.payload.anonymousId;
      state.traits = {
        ...state.traits,
        ...action.payload.traits
      };
    },
    [resetAction.type]: (state, action: PayloadAction<IdentifyPayload>) => {
      [USER_ID, ANON_ID, USER_TRAITS].forEach((key) => {
        action.payload.storage.removeItem(key);
      });
      state = {
        ...userIntialState()
      };
    }
  }
});

export default userSlice.reducer;
