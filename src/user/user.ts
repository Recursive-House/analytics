import { PREFIX } from '../utils/analytics.utils';
import { get } from "../utils/storage";
import { ANON_ID, USER_ID, USER_TRAITS } from '../utils/constants';

export function getPersistedUserData(storage) {
  return {
    userId: storage.getItem(USER_ID),
    anonymousId: storage.getItem(ANON_ID),
    traits: storage.getItem(USER_TRAITS)
  };
}

export const tempKey = (key) => PREFIX + 'TEMP' + PREFIX + key;

export function getUserPropFunc(storage) {
  return function getUserProp(key, instance, payload = {}) {
    /* 1. Try current state */
    const currentId = instance.getState('user')[key];
    if (currentId) {
      /*
        console.log(`from state ${key}`, currentId)
        /** */
      return currentId;
    }

    /* 2. Try event payload */
    if (payload && Object.keys(payload) && payload[key]) {
      /*
        console.log(`from payload ${key}`, payload[key])
        /** */
      return payload[key];
    }

    /* 3. Try persisted data */
    const persistedInfo = getPersistedUserData(storage)[key];
    if (persistedInfo) {
      /*
        console.log(`from persistedInfo ${key}`, persistedInfo)
        /** */
      return persistedInfo;
    }

    /* 4. Else, try to get in memory placeholder. TODO watch this for future issues */
    return get(tempKey(key)) || null;
  };
}
