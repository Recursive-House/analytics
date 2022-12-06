import { getDeletedReducers, replaceDeletedReducer, deleteSensitiveQueue } from './queue.utils';
import * as pluginUtils from './plugins/plugin.utils';
import { resetRemovedEvents } from './store';

describe('queue.utils', () => {
  describe('getDeletedReducers', () => {
    it('should not allow deleted reducers to exist', () => {
      const reducers = {
        pluginOne: {
          eventOne: () => {},
          eventTwo: () => {},
          eventThree: () => {}
        },
        pluginTwo: {
          eventOne: () => {},
          eventTwo: () => {},
          eventThree: () => {}
        }
      };

      jest.spyOn(pluginUtils, 'getPluginMethods').mockReturnValue(reducers);
      const deletedReducersMap = getDeletedReducers(new Set(['eventOne', 'eventTwo']));
      expect(deletedReducersMap['eventOne']).toBeFalsy();
    });
  });

  describe('replaceDeletedReducer', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should not replace reducer if there are no collected aborted events', () => {
      const store = {
        replaceReducer: jest.fn()
      };

      resetRemovedEvents();
      replaceDeletedReducer(store as any, {} as any);
      expect(store.replaceReducer).not.toBeCalled();
    });
  });
});
