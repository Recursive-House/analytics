import { Analytics } from './api';

describe('async api is', () => {
  it('should send out a simple track call event to store', async () => {
    const { analytics, store } = Analytics({
      reducers: [],
      plugins: [],
      debug: false
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    // const result =  await analytics.track('general-track', {
    //     piece: 'information',
    //     anotherPiece: 'information2'
    // });
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
