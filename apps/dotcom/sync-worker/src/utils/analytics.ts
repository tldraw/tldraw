import { createSentry } from '@tldraw/worker-shared'
import { Analytics, Environment } from '../types'

export interface EventData {
	blobs?: string[]
	indexes?: [string]
	doubles?: number[]
}

export function writeDataPoint(
	sentry: ReturnType<typeof createSentry> | undefined,
	measure: Analytics | undefined,
	env: Environment,
	name: string,
	{ blobs, indexes, doubles }: EventData
) {
	try {
		measure?.writeDataPoint({
			// We put the worker name in the second spot for legacy reasons: when we first introduced analytics
			// we only included the name. If we were to change the order it would be hard to query old data.
			blobs: [name, env.WORKER_NAME ?? 'development-tldraw-multiplayer', ...(blobs ?? [])],
			doubles,
			indexes,
		})
	} catch (_e) {
		// // eslint-disable-next-line @typescript-eslint/no-deprecated
		// sentry?.withScope((scope) => {
		// 	scope.setExtra('name', name)
		// 	// eslint-disable-next-line @typescript-eslint/no-deprecated
		// 	sentry.captureException(e)
		// })
		// console.error('Failed to write data point', e)
	}
}
