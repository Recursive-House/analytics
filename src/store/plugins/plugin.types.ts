import { AnalyticsInstance } from '../../api';
import { LIFECYLCE_EVENTS_KEYS } from '../../core-utils';
import { abort } from './plugin.utils';

export type LifeCycleEvent = ({ payload, config, instance }) => ReturnType<typeof abort>;
type Config = Record<string, string | object | number | unknown>;

export interface PluginState {
  name: string;
  enabled: boolean;
  initialize: boolean;
  config: Config;
  isPlugin: true;
  bootstrap?: ({ instance, config, payload }: { instance: AnalyticsInstance; config: Config; payload: Plugin }) => void;
  loaded: (loaded: Config) => any;
}

export interface PluginProcessedState extends Omit<PluginState, 'initialize' | 'loaded'> {
  initialized: boolean;
  loaded: boolean;
  abortableEvents: Record<string, boolean>;
}

export type Plugin = {
  [K in keyof Omit<LIFECYLCE_EVENTS_KEYS, keyof PluginState>]: LifeCycleEvent;
} & PluginState;
