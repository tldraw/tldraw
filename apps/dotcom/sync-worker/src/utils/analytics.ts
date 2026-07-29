import { Environment } from '../types'

export interface EventData {
	blobs?: string[]
	indexes?: [string]
	doubles?: number[]
}

/**
 * Writes a datapoint to the Analytics Engine dataset bound as MEASURE. Every datapoint shares one
 * layout: blob1 is the event name and blob2 the worker name, followed by the caller's blobs.
 * Grafana dashboards query blobs by position, so the layout of existing events must not change;
 * new dimensions go at the end (blobs) or use self-describing `key:value` blobs.
 *
 * Write failures are swallowed: losing a datapoint must never break the request that emitted it.
 */
export function writeDataPoint(
	env: Environment,
	name: string,
	{ blobs, indexes, doubles }: EventData
) {
	try {
		env.MEASURE?.writeDataPoint({
			// We put the worker name in the second spot for legacy reasons: when we first introduced
			// analytics we only included the name. If we were to change the order it would be hard to
			// query old data.
			blobs: [name, env.WORKER_NAME ?? 'development-tldraw-multiplayer', ...(blobs ?? [])],
			doubles,
			indexes,
		})
	} catch (_e) {
		// noop
	}
}
