export const OBJECT = 'object';

export const ANONID = 'anonymousId'

export function isObject(obj) {
  if (!isObjectLike(obj)) return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

export function isObjectLike(obj) {
  return obj && (typeof obj === OBJECT || obj !== null);
}
