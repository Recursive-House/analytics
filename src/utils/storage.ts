import { OBJECT, PREFIX } from './analytics.utils';

export const GLOBAL = 'global';

export const KEY = PREFIX + GLOBAL + PREFIX;

export const globalContext =
  (typeof self === OBJECT && self.self === self && self) ||
  (typeof global === OBJECT && global[GLOBAL] === global && global) ||
  this;

/* initialize global object */
if (!globalContext[KEY]) {
  globalContext[KEY] = {};
}
/**
 * Get value from global context
 * @param {string} key - Key of value to get
 * @returns {*} value
 */
export function get(key) {
  return globalContext[KEY][key];
}

/**
 * Set value to global context
 * @param {string} key - Key of value to set
 * @param {*} value
 * @returns value
 */
export function set(key, value) {
  return (globalContext[KEY][key] = value);
}

/**
 * Remove value to global context
 * @param {string} key - Key of value to remove
 */
export function remove(key) {
  delete globalContext[KEY][key];
}
