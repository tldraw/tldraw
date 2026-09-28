type StepFields = Record<`d_${string}` | `t_${string}`, number>

/**
 * Server steps of one sync connect, echoed to the client as `d_<step>` (since the previous mark)
 * and `t_<step>` (since start). Deltas always sum to the last step's `t`, so charts can stack them.
 */
export class ConnectMarks {
	private prev: number
	private readonly out: StepFields = {}

	constructor(
		private readonly start: number,
		private readonly now: () => number = Date.now
	) {
		this.prev = start
	}

	last() {
		return this.prev
	}

	// Clamped because `start` can come from the worker's clock, not this machine's.
	mark(step: string, at: number = this.now()) {
		const t = Math.max(at, this.prev)
		this.out[`d_${step}`] = Math.round(t - this.prev)
		this.out[`t_${step}`] = Math.round(t - this.start)
		this.prev = t
	}

	markAfter(step: string, ms: number) {
		this.mark(step, Math.min(this.prev + ms, this.now()))
	}

	fields(): StepFields {
		return { ...this.out }
	}
}
