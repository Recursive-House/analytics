import { AnalyticsInstance } from '../../api';
import { LIFECYLCE_EVENTS_KEYS } from '../../utils';

export type LifeCycleEvent = ({ payload, config, instance }) => ({
  abort: boolean;
  message: string;
}) | void;
export type Config = Record<string, string | object | number | unknown>;

export interface PluginState {
  name: string;
  enabled: boolean;
  initialize: boolean;
  config: Config;
  bootstrap?: ({ instance, config, payload }: { instance: AnalyticsInstance; config: Config; payload: Plugin }) => void;
  loaded: (loaded: Config) => any;
}

export interface PluginProcessedState extends Omit<PluginState, 'initialize' | 'loaded'> {
  initialized: boolean;
  loaded: boolean;
  abortableEvents: Record<string, boolean>;
}

export type Plugin = {
  [K in Exclude<LIFECYLCE_EVENTS_KEYS, keyof PluginState>]: LifeCycleEvent extends Function
    ? LifeCycleEvent
    : LifeCycleEvent extends string
    ? string
    : LifeCycleEvent extends number
    ? number
    : unknown;
} & PluginState;
