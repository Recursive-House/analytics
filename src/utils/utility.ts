import { AnalyticsInstance } from "../api";
import { Plugin } from "../store/plugins/plugin.types";

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

export function appendArguments(fn, instance) {
  return function () {
    const args = Array.prototype.slice.call(arguments);
    const newArgs = args.concat([instance]);
    return fn.apply(this, newArgs);
  }
}

export function preparePluginsMethods(plugin: Plugin, instance: AnalyticsInstance) {
  const pluginMethods = Object.values(plugin.methods).map(method => {
    return appendArguments(method, instance);
  });
  const updatedPlugin = {
    ...plugin,
    ...pluginMethods
  }
  return updatedPlugin;
};
