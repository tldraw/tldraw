/**
 * An object that is currently being streamed to the user, so may or may not be complete.
 * If it's not yet complete, the object will be a partial and `complete` will be set to false.
 * If it's complete, the object will be the full object and `complete` will be set to true.
 *
 * The object also has a property for how many milliseconds have passed since the streaming started.
 */
export type Streaming<T> =
	| (Partial<T> & { complete: false; time: number })
	| (T & { complete: true; time: number })
