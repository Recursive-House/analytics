import { Analytics } from './api';
import { EVENTS } from './core-utils';

describe('async api is', () => {
  let analyticsInstance;
  let storeInstance;
  const MOCK_PLUGIN = {
    name: 'samplePlugin',
    enabled: true,
    initialize: true
  } as any;

  beforeEach(() => {
    const { analytics, store } = Analytics({
      reducers: [],
      plugins: [],
      debug: false
    });

    analyticsInstance = analytics;
    storeInstance = store;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('api', () => {
    describe('track', () => {
      it("shouldn't allow track called with invalid event", async () => {
        await expect(() => analyticsInstance.track('')).rejects.toThrow(TypeError);
      });

      it("shouldn't allow track call with disabled plugin in simple event call to fire", async () => {
        // we have to use an internal function since analytics move this function around a lot
        // since track becomes readonly after getting mocked, we just use an internal track call to check execution
        const internalTrack = jest.fn();
        const plugin = {
          ...MOCK_PLUGIN,
          enabled: false,
          track: () => {
            internalTrack();
          }
        };

        analyticsInstance = Analytics({
          reducers: [],
          plugins: [plugin],
          debug: false
        }).analytics;
        await analyticsInstance.track('event', 'payload of sample event', {
          ['sample-plugins']: true
        });
        await expect(internalTrack).not.toBeCalled();
      });

      it("shouldn't allow callback before 'Start' suffixed and event calls have finished", async () => {
        const internalTrackStart = jest.fn();
        const internalTrack = jest.fn();
        const samplePlugin = {
          name: 'samplePlugin',
          enabled: true,
          initialize: true,
          trackStart() {
            internalTrackStart();
          },
          track() {
            internalTrack();
          }
        } as any;

        const callbackSpy = jest.fn().mockReturnValue('callback spy called');

        analyticsInstance = Analytics({
          reducers: [],
          plugins: [samplePlugin],
          debug: false
        }).analytics;

        await analyticsInstance.track('event', callbackSpy);
        await expect(callbackSpy).not.toHaveBeenCalledBefore(internalTrackStart);
        await expect(callbackSpy).not.toHaveBeenCalledBefore(internalTrack);
        await expect(callbackSpy).toHaveBeenCalled();
      });

      it("shouldn't call resolve if there is an error in the event functions", async () => {
        const internalTrack = jest.fn();
        const samplePlugin = {
          name: 'samplePlugin',
          enabled: true,
          initialize: true,
          trackStart() {
            throw new Error('random error called');
          },
          track() {
            internalTrack();
          }
        } as any;
        analyticsInstance = Analytics({
          reducers: [],
          plugins: [samplePlugin],
          debug: false
        }).analytics;

        analyticsInstance.track('event', { key: 'value' }).catch((e) => {
          expect(e.message).toBe('random error called');
        });
      });

      it('should return the trackEndAction when the promise finishes executing', async () => {
        const trackResult = await analyticsInstance.track('event', { tell: 'us' });
        expect(trackResult.type).toBe(EVENTS.trackEnd);
      });
    });

    describe('on', () => {
      it("shouldn't allow invalid name or callback function", () => {
        expect(() => analyticsInstance.on('', 'callback')).toThrow(TypeError);
      });

      it("shouldn't call callback function with un matched event called", () => {
        const callbackSpy = jest.fn();
        analyticsInstance.on('randomEvent', callbackSpy);
        analyticsInstance.enqueue({ type: 'nonRandomEvent' });
        expect(callbackSpy).not.toHaveBeenCalled();
      });

      it('should execute callback function if the events are the same', () => {
        const callbackSpy = jest.fn();
        const callback = () => callbackSpy();
        analyticsInstance.on('randomEvent', callback);
        analyticsInstance.enqueue({ type: 'randomEvent' });
        expect(callbackSpy).toHaveBeenCalled();
      });
    });

    describe('ready', () => {
      it("shouldn't allow a callback to be registered in the on event", () => {
        storeInstance.getState = () => ({ ready: true });
        const onSpy = jest.spyOn(analyticsInstance, 'on');
        analyticsInstance.ready(() => ({}));
        expect(onSpy).not.toHaveBeenCalled();
      });
    });

    describe('enable', () => {
      it('should not be false if enabled', async () => {
        const plugin = {
          ...MOCK_PLUGIN,
          enabled: false
        };

        const analyticInstance = Analytics({
          reducers: [],
          plugins: [plugin],
          debug: false
        }).analytics;
        await analyticInstance.plugins.enable('samplePlugin');
        const pluginState = analyticInstance.getState()[MOCK_PLUGIN.name];
        console.log('pluginState', pluginState);
        expect(pluginState.enabled).toBe(true);
      });

      it('should not enable if plugin is not in plugin collection passed', async () => {
        const plugin = { ...MOCK_PLUGIN, enabled: false };
        const analyticInstance = Analytics({
          reducers: [],
          plugins: [plugin],
          debug: false
        }).analytics;
        await analyticInstance.plugins.enable(['samplePlugins', 'unsampledPlugin']);
        const pluginState = analyticInstance.getState()[MOCK_PLUGIN.name];
        expect(pluginState.enabled).toBe(false);
      });
    });

    describe('disabled', () => {
      it('should not be true if disabled', async () => {
        const plugin = {
          ...MOCK_PLUGIN,
          enabled: true
        };

        const analyticInstance = Analytics({
          reducers: [],
          plugins: [plugin],
          debug: false
        }).analytics;
        await analyticInstance.plugins.disable('samplePlugin');
        const pluginState = analyticInstance.getState()[MOCK_PLUGIN.name];
        expect(pluginState.enabled).toBe(false);
      });

      it('should not disable if plugin is not in plugin collection passed', async () => {
        const plugin = { ...MOCK_PLUGIN, enabled: true };
        const analyticInstance = Analytics({
          reducers: [],
          plugins: [plugin],
          debug: false
        }).analytics;
        await analyticInstance.plugins.enable(['samplePlugins', 'unsampledPlugin']);
        const pluginState = analyticInstance.getState()[MOCK_PLUGIN.name];
        expect(pluginState.enabled).toBe(true);
      });
    });
  });
});
