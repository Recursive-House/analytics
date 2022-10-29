import { AnalyticsInstance } from '../../api';
import {
  pluginMethods,
  abort,
  updatePluginMethodsEvents,
  abortableReducer,
  createCorePluginReducer,
  createPluginSpecificReducers,
  createAllPluginReducers
} from './plugin.utils';

const PLUGIN_STATE = {
  isPlugin: true,
  name: 'sample-plugin',
  enabled: true,
  initialized: false,
  loaded: false,
  abortableEvents: {},
  config: {}
};
describe('plugin.utils.ts', () => {
  describe('abortabledReducer', () => {
    const sampleReducer = (state = PLUGIN_STATE, action) => {
      return {
        abort: false,
        message: 'sample reducer return value'
      };
    };
    it('should not update state if its abortable', () => {
      const plugin = {
        ...PLUGIN_STATE,
        abortableEvents: {}
      };
      abortableReducer('track', plugin, sampleReducer, {
        payload: {},
        config: {},
        instance: {}
      });
      expect(plugin.abortableEvents['track']).toBe(undefined);
    });
    it('should not update state if there is an invalid reducer', () => {
      const state = {
        ...PLUGIN_STATE,
        abortableEvents: {}
      };

      expect(() =>
        abortableReducer('track', state, 'sampleReducer', {
          payload: {},
          config: {},
          instance: {}
        })
      ).toThrow(TypeError);
    });

    it('should not work when abort is called but not returned', () => {
        const state = {
          ...PLUGIN_STATE,
          abortableEvents: {}
        };

        const sampleReducer = ({ abort }) => {
            abort();
            return;
        }
  
        expect(() =>
          abortableReducer('track', state, sampleReducer, {
            payload: {},
            config: {},
            instance: {}
          })
        ).toThrow(Error);
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
        const plugin = {...PLUGIN_STATE, sampleFun: () => ({}), sampleFunc2: () => ({}) };
        const { pluginCoreReducer }  = createCorePluginReducer(plugin as any, {} as AnalyticsInstance);
        expect(Object.keys(pluginCoreReducer).length).toBe(1);
    });
  });


  describe('createPluginSpecificReducers', () => {
    it('should not allow any generic events to load in into the reducer', () => {
        const plugin = {...PLUGIN_STATE, sampleFun: () => ({}), sampleFunc2: () => ({}) };
        const pluginSpecificReducer = createPluginSpecificReducers(plugin as any, {} as AnalyticsInstance);
        expect(Object.keys(pluginSpecificReducer).length).toBe(2);
    })
  });
});