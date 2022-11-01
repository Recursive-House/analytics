import { Analytics } from './api';

describe('async api is', () => {
  let analyticsInstance;
  let storeInstance;

  beforeEach(() => {
    let { analytics, store } = Analytics({
      reducers: [],
      plugins: [],
      debug: false
    });

    analyticsInstance = analytics;
    storeInstance = store;
  });

  it('should send out a simple track call event to store', async () => {
    const dispatchSpy = jest.spyOn(storeInstance, 'dispatch');
    await analyticsInstance.track('general-track', {
      piece: 'information',
      anotherPiece: 'information2'
    });
    expect(dispatchSpy).toHaveBeenCalled();
  });

  describe('track', () => {
    it("shouldn't allow track called with valid event", async () => {
      await expect(() => analyticsInstance.track('')).rejects.toThrow(TypeError);
    });

    it("shouldn't allow track call with disabled plugin in simple event call to fire", async () => {
      const samplePlugin = {
        name: 'samplePlugin',
        track: () => {
          console.warn('debugger track called');
        }
      } as any;

      const pluginTrackSpy = jest.spyOn(samplePlugin, 'track');

      analyticsInstance = Analytics({
        reducers: [],
        plugins: [samplePlugin],
        debug: false
      }).analytics;
      await analyticsInstance.track('event', 'payload of sample event', {
        samplePlugins: true
      })
      await expect(pluginTrackSpy).not.toBeCalled();
    });
  });

  describe('on', () => {
    it("shouldn't allow invalid name or callback function", () => {
      expect(() => analyticsInstance.on('', 'callback')).toThrow(TypeError);
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
});
