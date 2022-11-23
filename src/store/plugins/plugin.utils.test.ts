import { AnalyticsInstance } from '../../api';
import { getAbortedEvents, getRemovedEvents, resetAbortedEvents, resetRemovedEvents, setAbortedEvents } from '../store';
import * as pluginUtils from './plugin.utils';
import {
  updatePluginMethodsEvents,
  conditonalReducer,
  createCorePluginReducer,
  createPluginSpecificReducers,
  createAllPluginReducers
} from './plugin.utils';

const PLUGIN_STATE = {
  name: 'sample-plugin',
  enabled: true,
  initialized: false,
  loaded: false,
  config: {}
};

beforeEach(() => {
  resetAbortedEvents();
  resetRemovedEvents();

})

afterEach(() => {
  jest.restoreAllMocks();
});

describe('plugin.utils.ts', () => {
  describe('conditonalReducer', () => {
    const sampleReducer = (state = PLUGIN_STATE, action) => {
      return {
        abort: false,
        message: 'sample reducer return value'
      };
    };
    
    it('should not update state if its abortable', () => {
      conditonalReducer('track', PLUGIN_STATE, sampleReducer, {
        payload: {},
        config: {},
        instance: {}
      });
      const state = getAbortedEvents('track');
      expect(state).toBe(undefined);
    });
    it('should not update state if there is an invalid reducer', () => {
      expect(() =>
        conditonalReducer('track', PLUGIN_STATE, 'sampleReducer', {
          payload: {},
          config: {},
          instance: {}
        })
      ).toThrow(TypeError);
    });

    it('should not work when abort is called but not returned', () => {
      const sampleReducer = ({ abort }) => {
        abort();
        return;
      };

      expect(() =>
        conditonalReducer('track', PLUGIN_STATE, sampleReducer, {
          payload: {},
          config: {},
          instance: {}
        })
      ).toThrow(Error);
    });

    it('should not work when abort is called but not returned', () => {
      const sampleReducer = ({ abort }) => {
        abort();
        return;
      };

      expect(() =>
        conditonalReducer('track', PLUGIN_STATE, sampleReducer, {
          payload: {},
          config: {},
          instance: {}
        })
      ).toThrow(Error);
    });

    it('should not should not call plugin event if event functionality aborted', () => {
      let reducer = jest.fn(sampleReducer);
      setAbortedEvents('track', true);
      conditonalReducer('track', PLUGIN_STATE, reducer,  {
        payload: {},
        config: {},
        instance: {}
      });
      expect(reducer).not.toBeCalled();
    });

    it('should set removed events in removed events store when function is called ', () => {
      const removedEventReducer = ({ remove }) => {
        remove();
      }
      conditonalReducer('track', PLUGIN_STATE, removedEventReducer,  {
        payload: {},
        config: {},
        instance: {}
      });
      expect(getRemovedEvents('track')).toBe(true);
    });
  });

  describe('pluginMethods', () => {
    it('should not update without plugin string in name', () => {
      const plugin = { ...PLUGIN_STATE, name: undefined };

      expect(() => updatePluginMethodsEvents(plugin as any, 'track')).toThrow(TypeError);
    });

    it('should not update with a valide event passed through', () => {
      const plugin = { ...PLUGIN_STATE, name: '' };
      expect(() => updatePluginMethodsEvents(plugin as any, '')).toThrow(TypeError);
    });
  });

  describe('createCorePluginReducer', () => {
    it('should not allow any other reducer other than core events', () => {
      const plugin = { ...PLUGIN_STATE, sampleFun: () => ({}), sampleFunc2: () => ({}) };
      const { pluginCoreReducer } = createCorePluginReducer(plugin as any, {} as AnalyticsInstance);
      expect(Object.keys(pluginCoreReducer).length).toBe(3);
    });

    it('should not call plugin event if plugin disabled on single event', () => {
      const plugin = { ...PLUGIN_STATE, track: () => ({}) };
      const trackSpy = jest.spyOn(plugin, 'track');
      const { pluginCoreReducer } = createCorePluginReducer(plugin as any, {} as AnalyticsInstance);
      pluginCoreReducer['track/track'](
        {},
        {
          type: 'track',
          payload: {
            options: {
              disabledPlugins: {
                samplePlugin: true
              }
            }
          }
        }
      );
      expect(trackSpy).not.toHaveBeenCalled();
    });
  });

  describe('createPluginSpecificReducers', () => {
    it('should not allow any generic events to load in into the reducer', () => {
      const plugin = { ...PLUGIN_STATE, sampleFun: () => ({}), sampleFunc2: () => ({}) };
      const pluginSpecificReducer = createPluginSpecificReducers(plugin as any, {} as AnalyticsInstance);
      expect(Object.keys(pluginSpecificReducer).length).toBe(2);
    });

    it('should not call plugin event if plugin disabled on single event', () => {
      const plugin = { ...PLUGIN_STATE, tracker: () => ({}) };
      const abortableRed = jest.spyOn(pluginUtils, 'conditonalReducer');
      const pluginCoreReducer = createPluginSpecificReducers(plugin as any, {} as AnalyticsInstance);
      pluginCoreReducer['tracker'](
        {},
        {
          type: 'tracker',
          payload: {
            options: {
              disabledPlugins: {
                samplePlugin: true
              }
            }
          }
        }
      );
      expect(abortableRed).not.toHaveBeenCalled();
    });
  });
});
