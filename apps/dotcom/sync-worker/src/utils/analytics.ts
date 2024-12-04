import { Analytics, Environment } from '../types'

export interface EventData {
	blobs?: string[]
	indexes?: [string]
	doubles?: number[]
}

export function writeDataPoint(
	measure: Analytics | undefined,
	env: Environment,
	name: string,
	{ blobs, indexes, doubles }: EventData
) {
	measure?.writeDataPoint({
		// We put the worker name in the second spot for legacy reasons: when we first introduced analytics
		// we only included the name. If we were to change the order it would be hard to query old data.
		blobs: [name, env.WORKER_NAME ?? 'development-tldraw-multiplayer', ...(blobs ?? [])],
		doubles,
		indexes,
	})
}
