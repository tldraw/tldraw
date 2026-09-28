import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'

export type LoadServerTimings = Extract<TLCustomServerEvent, { type: 'first_load_server' }>

export interface LoadTrackerDeps<Step extends string> {
	now(): number
	mark(name: string): void
	measure(step: Step, start: number, end: number): void
	log(line: string): void
}

export interface LoadStepRow<Step extends string> {
	step: Step
	t: number
	delta: number
}

export interface LoadReport<Step extends string> {
	load_id: string
	steps: LoadStepRow<Step>[]
	total_ms: number
	[key: `t_${string}`]: number | undefined
	[key: `d_${string}`]: number | undefined
	[key: `srv_${string}`]: number | string | boolean | undefined
}

export interface LoadTrackerOptions<Step extends string> {
	steps: readonly Step[]
	/** Default: uniqueId(21). */
	loadId?: string
	/** The origin marks and reports are relative to. Default: 0 (navigation start). */
	t0?: number
	logPrefix: string
	logHeader: string
	/** performance.mark name prefix, e.g. 'tla' or 'tla-file'. */
	markPrefix: string
}

/** The server's whole connect span: its last step, since steps only run when needed. */
export function serverTotalMs(msg: LoadServerTimings): number | undefined {
	const ts = Object.entries(msg)
		.filter(([k, v]) => k.startsWith('t_') && typeof v === 'number')
		.map(([, v]) => v as number)
	return ts.length ? Math.max(...ts) : undefined
}

export function createLoadTracker<Step extends string>(
	deps: LoadTrackerDeps<Step>,
	opts: LoadTrackerOptions<Step>
) {
	const loadId = opts.loadId ?? uniqueId(21)
	const t0 = opts.t0 ?? 0
	const marks: Partial<Record<Step, number>> = {}
	let lastT = 0
	let reported = false
	let server: LoadServerTimings | null = null
	const serverWaiters: Array<() => void> = []
	// Buffered until enableLiveLog(), which replays the steps recorded before it.
	let live = false
	const lines: string[] = []

	function say(line: string) {
		if (live) deps.log(line)
		else lines.push(line)
	}

	function mark(step: Step) {
		if (step in marks) return
		const t = Math.round(deps.now() - t0)
		marks[step] = t
		deps.mark(`${opts.markPrefix}:${step}`)
		deps.measure(step, t0 + lastT, t0 + t)
		say(`[${opts.logPrefix}] ${step} +${t}ms (+${t - lastT})`)
		lastT = t
	}

	function buildReport(): LoadReport<Step> {
		// Sorted by when each step happened, not by the list: the router fetches both route chunks in
		// parallel, so file-chunk-loaded regularly lands before clerk-loaded.
		const seen = opts.steps
			.filter((step) => marks[step] !== undefined)
			.sort((a, b) => marks[a]! - marks[b]!)
		const steps: LoadStepRow<Step>[] = []
		let prev = 0
		for (const step of seen) {
			const t = marks[step]!
			steps.push({ step, t, delta: t - prev })
			prev = t
		}
		const report: LoadReport<Step> = {
			load_id: loadId,
			steps,
			total_ms: prev,
		}
		for (const row of steps) {
			const key = row.step.replaceAll('-', '_')
			report[`t_${key}`] = row.t
			report[`d_${key}`] = row.delta
		}
		if (server) {
			const { type: _type, loadId: _loadId, ...timings } = server
			for (const [k, v] of Object.entries(timings)) {
				if (v !== undefined) report[`srv_${k}`] = v
			}
		}
		return report
	}

	/** The sync server's side of this load, sent once after the socket connects. */
	function setServerTimings(msg: LoadServerTimings) {
		if (msg.loadId !== loadId) return
		// A reconnect inside the report window sends a second, warm echo; the first one is the load.
		if (server) return
		server = msg
		for (const wake of serverWaiters.splice(0)) wake()
		say(
			`[${opts.logPrefix}] server: ${msg.cold ? 'cold' : 'warm'} room, connect ${serverTotalMs(msg) ?? '?'}ms` +
				(msg.d_boot !== undefined ? `, boot ${msg.d_boot}ms` : '')
		)
	}

	/**
	 * Resolves true once the sync server's echo is in, or false at the deadline. The echo is sent
	 * just after the connect handshake, so on a warm load it can trail board-visible by a few ms.
	 */
	function whenServerTimings(timeoutMs: number): Promise<boolean> {
		if (server) return Promise.resolve(true)
		return new Promise((resolve) => {
			const timer = setTimeout(() => resolve(false), timeoutMs)
			serverWaiters.push(() => {
				clearTimeout(timer)
				resolve(true)
			})
		})
	}

	/** Start printing steps as they happen, after replaying the ones already recorded. */
	function enableLiveLog() {
		if (live) return
		live = true
		deps.log(opts.logHeader)
		for (const line of lines.splice(0)) deps.log(line)
	}

	function takeReport(): LoadReport<Step> | null {
		if (reported) return null
		reported = true
		return buildReport()
	}

	return {
		loadId,
		mark,
		getMarks: () => ({ ...marks }),
		buildReport,
		takeReport,
		setServerTimings,
		whenServerTimings,
		enableLiveLog,
		isReported: () => reported,
	}
}

export type LoadTracker<Step extends string> = ReturnType<typeof createLoadTracker<Step>>
