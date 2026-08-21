import { bucketFlags, WALL_TIME_BUCKETS_MS } from './classify'

// The two flush knobs. At 0/0 the accumulator flushes at the end of every tail invocation, which is
// what ships: per-batch write volume is a function of tail batch size, which Cloudflare does not
// document, so day one tells us what it actually is. Raising these to 5000 / 5000 buffers across
// invocations — isolates persist between them — which bounds writes at roughly 1.5M rows/month no
// matter the batch size. The cost of buffering is that an isolate eviction drops an unflushed tally:
// acceptable for aggregates, which are sampled anyway, and the reason `err` rows never come through
// here.
export const FLUSH_AFTER_EVENTS = 0
export const FLUSH_AFTER_MS = 0

export interface AggInput {
	scriptName: string
	entrypoint: string
	handler: string
	outcome: string
	scriptVersion: string
	wallTime: number
	cpuTime: number
}

export interface AggBucket {
	scriptName: string
	entrypoint: string
	handler: string
	outcome: string
	scriptVersion: string
	count: number
	sumWall: number
	maxWall: number
	sumCpu: number
	maxCpu: number
	le: number[]
}

export class Aggregator {
	private buckets = new Map<string, AggBucket>()
	private eventsSinceFlush = 0
	private lastFlushAtMs: number

	// Defaults to the shipped 0/0 knobs, so worker.ts's `new Aggregator()` is unchanged. Tests can
	// pass real thresholds to exercise buffering, which the shipped 0/0 never does.
	constructor(
		private readonly flushAfterEvents = FLUSH_AFTER_EVENTS,
		private readonly flushAfterMs = FLUSH_AFTER_MS
	) {
		// Stamped at construction rather than left at 0: with a real (non-zero) flushAfterMs, a cold
		// lastFlushAtMs of 0 would make `nowMs - lastFlushAtMs >= flushAfterMs` true against any real
		// epoch `now`, firing the wall-clock branch on the very first check.
		this.lastFlushAtMs = Date.now()
	}

	add(input: AggInput): void {
		// NUL-joined because it cannot appear in any component: `handler` embeds a runtime-supplied
		// `rpcMethod`, so a printable delimiter could be forged into a colliding key.
		const key = [
			input.scriptName,
			input.entrypoint,
			input.handler,
			input.outcome,
			input.scriptVersion,
		].join('\0')

		let bucket = this.buckets.get(key)
		if (!bucket) {
			bucket = {
				scriptName: input.scriptName,
				entrypoint: input.entrypoint,
				handler: input.handler,
				outcome: input.outcome,
				scriptVersion: input.scriptVersion,
				count: 0,
				sumWall: 0,
				maxWall: 0,
				sumCpu: 0,
				maxCpu: 0,
				le: WALL_TIME_BUCKETS_MS.map(() => 0),
			}
			this.buckets.set(key, bucket)
		}

		bucket.count += 1
		bucket.sumWall += input.wallTime
		bucket.maxWall = Math.max(bucket.maxWall, input.wallTime)
		bucket.sumCpu += input.cpuTime
		bucket.maxCpu = Math.max(bucket.maxCpu, input.cpuTime)
		const flags = bucketFlags(input.wallTime)
		for (let i = 0; i < flags.length; i++) bucket.le[i] += flags[i]

		this.eventsSinceFlush += 1
	}

	shouldFlush(nowMs: number): boolean {
		return (
			this.eventsSinceFlush >= this.flushAfterEvents ||
			nowMs - this.lastFlushAtMs >= this.flushAfterMs
		)
	}

	drain(nowMs: number): AggBucket[] {
		const drained = [...this.buckets.values()]
		this.buckets.clear()
		this.eventsSinceFlush = 0
		this.lastFlushAtMs = nowMs
		return drained
	}
}
