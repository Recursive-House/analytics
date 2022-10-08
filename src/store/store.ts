
import queue, { enqueue } from './queue';
import track from './track';

export const coreReducers = {
    track,
    queue
}

export type RootState = { [ K in keyof typeof coreReducers ]: ReturnType<typeof coreReducers[K]> }
