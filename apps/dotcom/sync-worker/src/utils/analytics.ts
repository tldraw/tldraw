import { Analytics, Environment } from '../types'

export interface EventData {
	blobs?: string[]
	indexes?: [string]
	doubles?: number[]
}

/**
 * Writes datapoints to the Analytics Engine dataset bound as MEASURE. Every datapoint shares one
 * layout: blob1 is the event name and blob2 the worker name, followed by the caller's blobs.
 * Grafana dashboards query blobs by position, so the layout of existing events must not change;
 * new dimensions go at the end (blobs) or use self-describing `key:value` blobs.
 *
 * Write failures are swallowed: losing a datapoint must never break the request that emitted it.
 *
 * Obtain instances through {@link getMetrics}, which caches one per env object.
 */
export class Metrics {
	private readonly measure: Analytics | undefined
	private readonly workerName: string

	constructor(env: Environment) {
		this.measure = env.MEASURE
		this.workerName = env.WORKER_NAME ?? 'development-tldraw-multiplayer'
	}

	write(name: string, { blobs, indexes, doubles }: EventData) {
		try {
			this.measure?.writeDataPoint({
				// We put the worker name in the second spot for legacy reasons: when we first introduced
				// analytics we only included the name. If we were to change the order it would be hard to
				// query old data.
				blobs: [name, this.workerName, ...(blobs ?? [])],
				doubles,
				indexes,
			})
		} catch (_e) {
			// noop
		}
	}

	/**
	 * Starts a stopwatch. Each `report` writes a datapoint with the elapsed milliseconds appended
	 * as the last double, so one timer can mark several checkpoints.
	 */
	timer() {
		const start = Date.now()
		return {
			report: (name: string, data?: EventData) => {
				this.write(name, { ...data, doubles: [...(data?.doubles ?? []), Date.now() - start] })
			},
		}
	}
}

const metricsByEnv = new WeakMap<Environment, Metrics>()

/**
 * Returns the Metrics instance for this env, creating it on first use. The runtime passes the
 * same env object to every invocation in an isolate, so per-request code (routes, queue batches)
 * shares one instance instead of allocating per call.
 */
export function getMetrics(env: Environment): Metrics {
	let metrics = metricsByEnv.get(env)
	if (!metrics) {
		metrics = new Metrics(env)
		metricsByEnv.set(env, metrics)
	}
	return metrics
}
