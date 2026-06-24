/**
 * Generic pending-request store for bridging async server↔widget communication.
 *
 * One pending request per named channel. The server creates a pending request
 * and awaits it; the widget resolves or rejects it via `callServerTool('_exec_callback')`.
 *
 * Callbacks without an active pending request are ignored. This prevents late
 * duplicate callbacks from being replayed into a later request on the same channel.
 */

interface PendingEntry {
	resolve(value: unknown): void
	reject(reason: Error): void
	timer: ReturnType<typeof setTimeout>
}

export class PendingRequests {
	private pending = new Map<string, PendingEntry>()

	/**
	 * Create a pending request for the given channel.
	 * Returns a promise that resolves when `resolve()` is called,
	 * or rejects on timeout or if `reject()` is called.
	 *
	 * Throws if a request is already pending for this channel.
	 */
	create(channel: string, timeoutMs = 30_000): Promise<unknown> {
		if (this.pending.has(channel)) {
			throw new Error(`A request is already pending for channel "${channel}"`)
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
	 * Returns false if no request is currently pending.
	 */
	resolve(channel: string, value: unknown): boolean {
		const entry = this.pending.get(channel)
		if (!entry) return false

		clearTimeout(entry.timer)
		this.pending.delete(channel)
		entry.resolve(value)
		return true
	}

	/**
	 * Reject the pending request for the given channel.
	 * Returns false if no request is currently pending.
	 */
	reject(channel: string, error: string): boolean {
		const entry = this.pending.get(channel)
		if (!entry) return false

		clearTimeout(entry.timer)
		this.pending.delete(channel)
		entry.reject(new Error(error))
		return true
	}
}
