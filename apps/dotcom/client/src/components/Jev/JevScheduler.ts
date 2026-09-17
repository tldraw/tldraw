export interface JevOutcome {
	status: 'applied' | 'unchanged' | 'discarded'
	reason: string
}
export type JevUpdate<Result> = (
	| { status: 'thinking' }
	| { status: 'error'; reason: string; duration: number }
	| (JevOutcome & { result?: Result; duration: number })
) & { trigger?: string }

export interface JevSchedulerOptions<Result> {
	requestTimeoutMs?: number
	maxResultAgeMs?: number
	canRun(): boolean
	getBlockedReason?(): string | null
	request(signal: AbortSignal): Promise<Result>
	apply(result: Result): JevOutcome | void
	onError(error: unknown): void
	onUpdate?(update: JevUpdate<Result>): void
}

export class JevScheduler<Result> {
	private revision = 0
	private pending = false
	private disposed = false
	private timer: ReturnType<typeof setTimeout> | undefined
	private requestController: AbortController | undefined
	private nextRequestAt = 0
	private readyAt = 0
	private failures = 0

	constructor(private readonly options: JevSchedulerOptions<Result>) {}

	invalidate(preservePending = false) {
		this.revision++
		if (preservePending) return
		this.pending = false
		clearTimeout(this.timer)
	}

	trigger(delay = 180) {
		this.invalidate()
		this.pending = true
		this.readyAt = Date.now() + delay
		this.schedule(delay)
	}

	private schedule(delay: number) {
		clearTimeout(this.timer)
		this.timer = setTimeout(
			() => void this.run(),
			Math.max(delay, this.nextRequestAt - Date.now(), this.readyAt - Date.now())
		)
	}

	private async run() {
		if (this.disposed || !this.pending || this.requestController) return
		this.pending = false
		if (!this.options.canRun()) return
		const revision = this.revision
		const startedAt = Date.now()
		const controller = new AbortController()
		this.requestController = controller
		this.nextRequestAt = startedAt + 500
		this.options.onUpdate?.({ status: 'thinking' })
		const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? 2_500)
		try {
			const result = await this.options.request(controller.signal)
			this.failures = 0
			if (this.disposed) return
			const duration = Date.now() - startedAt
			const reason = !this.options.canRun()
				? (this.options.getBlockedReason?.() ??
					'The canvas is no longer available for automatic changes.')
				: controller.signal.aborted || duration >= (this.options.maxResultAgeMs ?? 1_500)
					? 'The result arrived too late.'
					: revision !== this.revision
						? 'New input or canvas changes superseded this decision.'
						: null
			const outcome = reason
				? { status: 'discarded' as const, reason }
				: (this.options.apply(result) ?? {
						status: 'applied' as const,
						reason: 'Applied the decision.',
					})
			this.options.onUpdate?.({ ...outcome, result, duration })
		} catch (error) {
			if (!this.disposed) {
				this.nextRequestAt = Date.now() + Math.min(30_000, 5_000 * 2 ** ++this.failures)
				this.options.onUpdate?.({
					status: 'error',
					reason: controller.signal.aborted
						? 'The request timed out.'
						: error instanceof Error
							? error.message
							: 'Jev could not be reached. Waiting before trying again.',
					duration: Date.now() - startedAt,
				})
				this.options.onError(error)
			}
		} finally {
			clearTimeout(timeout)
			this.requestController = undefined
			if (!this.disposed && this.pending) this.schedule(0)
		}
	}

	dispose() {
		if (this.disposed) return
		if (this.requestController)
			this.options.onUpdate?.({
				status: 'discarded',
				reason: 'Jev was turned off, its mode changed, or the canvas closed.',
				duration: 0,
			})
		this.disposed = true
		this.invalidate()
		this.requestController?.abort()
	}
}
