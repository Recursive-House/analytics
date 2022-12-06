import { watch } from './context.utils';

describe('context.utils', () => {
  describe('watch', () => {
    it("it should provide online status when it's deemed online", () => {
      global.navigator = {
        onLine: true
      } as Navigator;
      watch((online) => {
        console.log('test happened', online);
        expect(online).toBe(true);
      });
      const online = new CustomEvent('online');
      window.dispatchEvent(online);
    });
  });
});
