function listen(
  events: string[],
  func: EventListenerOrEventListenerObject,
  listenerType: 'addEventListener' | 'removeEventListener'
) {
  if (typeof window === 'undefined') return;
  const fn = window[listenerType];
  events.forEach((ev) => {
    fn(ev, func);
  });
}

export function check(): Promise<boolean> {
  return Promise.resolve(navigator.onLine);
}

export function watch(cb: (online: boolean) => void) {
  const fn = () => check().then(cb);
  const listener = listen.bind(null, ['online', 'offline'], fn);
  listener('addEventListener');
  return () => listener('removeEventListener');
}
