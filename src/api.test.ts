import { Analytics } from './api';
// import 'jest-extended';``

describe('async api is', () => {
  let analyticsInstance;
  let storeInstance;
  const MOCK_PLUGIN = {
    name: 'sample-plugins',
    enable: true,
    initialize: true
  } as any;

  beforeEach(() => {
    let { analytics, store } = Analytics({
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

  it('should send out a simple trasck call event to store', async () => {
    const dispatchSpy = jest.spyOn(storeInstance, 'dispatch');
    await analyticsInstance.track('general-track', {
      piece: 'information',
      anotherPiece: 'information2'
    });
    expect(dispatchSpy).toHaveBeenCalled();
  });

  describe('api', () => {
    describe('track', () => {
      it("shouldn't allow track called with valid event", async () => {
        await expect(() => analyticsInstance.track('')).rejects.toThrow(TypeError);
      });

      it("shouldn't allow track call with disabled plugin in simple event call to fire", async () => {
        // we have to use an internal function since analytics move this function around a lot
        // since track becomes readonly after getting mocked, we just use an internal track call to check execution
        const internalTrack = jest.fn();
        const plugin = {
          ...MOCK_PLUGIN,
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
        await expect(internalTrackStart).toHaveBeenCalledBefore(callbackSpy);
        await expect(internalTrack).toHaveBeenCalledBefore(callbackSpy);
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
});
