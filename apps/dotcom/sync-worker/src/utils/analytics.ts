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
	console.log('writeDataPoint', name, blobs, indexes, doubles)
	measure?.writeDataPoint({
		blobs: [name, env.WORKER_NAME ?? 'development-tldraw-multiplayer', ...(blobs ?? [])],
		doubles,
		indexes,
	})
}
