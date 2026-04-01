/**
 * Generic pending-request store for bridging async server↔widget communication.
 *
 * One pending request per named channel. The server creates a pending request
 * and awaits it; the widget resolves or rejects it via `callServerTool('_exec_callback')`.
 *
 * Handles the race condition where the callback arrives before the pending
 * request is created: early results are buffered and returned immediately
 * when `create()` is called.
 */

interface PendingEntry {
	resolve: (value: unknown) => void
	reject: (reason: Error) => void
	timer: ReturnType<typeof setTimeout>
}

interface EarlyResult {
	type: 'resolve'
	value: unknown
	timer: ReturnType<typeof setTimeout>
}

interface EarlyError {
	type: 'reject'
	error: string
	timer: ReturnType<typeof setTimeout>
}

/** How long to buffer early results before discarding them. */
const EARLY_RESULT_TTL_MS = 60_000

export class PendingRequests {
	private pending = new Map<string, PendingEntry>()
	private earlyResults = new Map<string, EarlyResult | EarlyError>()

	/**
	 * Create a pending request for the given channel.
	 * Returns a promise that resolves when `resolve()` is called,
	 * or rejects on timeout or if `reject()` is called.
	 *
	 * If a result arrived early (before this call), returns it immediately.
	 * Throws if a request is already pending for this channel.
	 */
	create(channel: string, timeoutMs = 30_000): Promise<unknown> {
		if (this.pending.has(channel)) {
			throw new Error(`A request is already pending for channel "${channel}"`)
		}

		// Check for early results (callback arrived before create)
		const early = this.earlyResults.get(channel)
		if (early) {
			this.earlyResults.delete(channel)
			clearTimeout(early.timer)
			if (early.type === 'resolve') {
				return Promise.resolve(early.value)
			} else {
				return Promise.reject(new Error(early.error))
			}
		}

		return new Promise<unknown>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(channel)
				reject(new Error(`Callback timed out after ${timeoutMs}ms for channel "${channel}"`))
			}, timeoutMs)

			this.pending.set(channel, { resolve, reject, timer })
		})
	}

	/**
	 * Resolve the pending request for the given channel.
	 * If no request is pending yet, buffers the result for when `create()` is called.
	 */
	resolve(channel: string, value: unknown): boolean {
		const entry = this.pending.get(channel)
		if (entry) {
			clearTimeout(entry.timer)
			this.pending.delete(channel)
			entry.resolve(value)
			return true
		}

		// Buffer as early result
		this.bufferEarlyResult(channel, { type: 'resolve', value })
		return true
	}

	/**
	 * Reject the pending request for the given channel.
	 * If no request is pending yet, buffers the error for when `create()` is called.
	 */
	reject(channel: string, error: string): boolean {
		const entry = this.pending.get(channel)
		if (entry) {
			clearTimeout(entry.timer)
			this.pending.delete(channel)
			entry.reject(new Error(error))
			return true
		}

		// Buffer as early error
		this.bufferEarlyResult(channel, { type: 'reject', error })
		return true
	}

	private bufferEarlyResult(
		channel: string,
		result: Omit<EarlyResult, 'timer'> | Omit<EarlyError, 'timer'>
	) {
		// Clear any existing early result for this channel
		const existing = this.earlyResults.get(channel)
		if (existing) clearTimeout(existing.timer)

		const timer = setTimeout(() => {
			this.earlyResults.delete(channel)
		}, EARLY_RESULT_TTL_MS)

		this.earlyResults.set(channel, { ...result, timer } as EarlyResult | EarlyError)
	}
}
