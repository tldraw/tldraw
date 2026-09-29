import { ConnectStep, TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { getFromSessionStorage, uniqueId } from '@tldraw/utils'

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

/**
 * Prints loads to the console; sending is gated separately (shouldReportLoad). The flag is created
 * in TlaEditor: importing `tldraw` here would pull the SDK into the entry chunk.
 */
export const LOADS_DEBUG_FLAG = 'logLoads'
export function shouldPrintLoads() {
	return getFromSessionStorage(`tldraw_debug:${LOADS_DEBUG_FLAG}`) === 'true'
}

export function isLoadStaff(email: string | null | undefined) {
	return !!email?.endsWith('@tldraw.com')
}

/** Staff always; everyone else through the `load_rum` percentage flag (0% by default). */
export function shouldReportLoad({
	email,
	flagEnabled,
}: {
	email: string | null | undefined
	flagEnabled: boolean
}) {
	return isLoadStaff(email) || flagEnabled
}

export const SERVER_ECHO_DEADLINE_MS = 3000

/**
 * `detail.devtools` is Chrome's Performance panel extension: it puts each step's span on its own
 * named track instead of the generic Timings track, where bare marks are just ticks.
 */
export function measureOnTrack(track: string) {
	return (step: string, start: number, end: number) => {
		try {
			performance.measure(`tla:${step}`, {
				start,
				end,
				detail: {
					devtools: {
						dataType: 'track-entry',
						track,
						color: 'primary',
						tooltipText: `${step}: ${Math.round(end - start)}ms since previous step`,
					},
				},
			})
		} catch {
			// measures are best effort
		}
	}
}

const SERVER_STEP_INFO: Record<ConnectStep, string> = {
	route: 'worker received the socket → room reached (clocks of two machines, approximate)',
	do_init:
		'room started while this request was in flight: constructor → onRequest, incl. the documentInfo read',
	auth: 'verify the Clerk token',
	file_record: 'file row lookup (Postgres; ~0 when the DO has it cached)',
	rate_limit: 'rate limiter',
	group_check: 'group role lookup, getRole (Postgres)',
	boot: 'room boot from empty SQLite: R2 + comments (see srv_boot_*)',
	get_room: 'rest of get or create the room',
	client_connect:
		'101 → client connect message arrives (RTT plus client main-thread time before ws.onopen)',
	handshake: 'connect message → reply goes out (the reply build is CPU and reads ~0)',
}

const SERVER_FIELD_INFO: Record<string, string> = {
	srv_cold: 'no live room in the DO; true alone does not mean an R2/Postgres load (see srv_boot_*)',
	srv_edge_colo: 'Cloudflare colo that received the socket',
	srv_do_colo: 'colo the file room runs in (absent until its one-off lookup resolves)',
	srv_pg_via: 'Postgres path: hyperdrive or pooler',
	srv_connect_bytes: 'length of the connect reply in characters (≈ bytes for ASCII JSON)',
	srv_boot_r2_ms: 'room boot from empty SQLite: R2 snapshot fetch',
	srv_boot_comments_ms:
		'room boot from empty SQLite: comments from Postgres (parallel with the R2 fetch)',
	srv_echo: 'server timings arrived; false = none within 3s of board-visible',
}

function fieldInfo(key: string, extra?: Record<string, string>) {
	return SERVER_FIELD_INFO[key] ?? extra?.[key] ?? ''
}

/** Server steps one row each, like the client step table, with the other `srv_*` fields apart. */
export function serverTables(fields: Record<string, unknown>, staff: boolean) {
	// A newer server can send steps this client doesn't know yet.
	const stepInfo: Partial<Record<string, string>> = SERVER_STEP_INFO
	const steps = Object.keys(fields)
		.map((k) => /^srv_t_(.+)$/.exec(k)?.[1])
		.filter((step): step is string => step !== undefined)
		.sort((a, b) => Number(fields[`srv_t_${a}`]) - Number(fields[`srv_t_${b}`]))
		.map((step) => ({
			step,
			'ms since connect start': fields[`srv_t_${step}`],
			'delta ms': fields[`srv_d_${step}`],
			...(staff && { what: stepInfo[step] ?? '' }),
		}))
	const other = Object.fromEntries(
		Object.entries(fields).filter(([k]) => k.startsWith('srv_') && !/^srv_[dt]_/.test(k))
	)
	return { steps, other }
}

/** `extraInfo` describes fields specific to the caller's event type; shared server entries win. */
export function describeLoadFields(
	fields: Record<string, unknown>,
	extraInfo?: Record<string, string>
) {
	return Object.fromEntries(
		Object.entries(fields).map(([k, value]) => [k, { value, what: fieldInfo(k, extraInfo) }])
	)
}

export function createLoadTracker<Step extends string>(
	deps: LoadTrackerDeps<Step>,
	opts: LoadTrackerOptions<Step>
) {
	const loadId = uniqueId(21)
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
		// Steps can complete out of list order (parallel route chunks), so sort by time.
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

	/** The sync server's side of this load. The caller picks which socket's echo that is. */
	function setServerTimings(msg: LoadServerTimings) {
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
		getServerTimings: () => server,
		buildReport,
		takeReport,
		setServerTimings,
		whenServerTimings,
		enableLiveLog,
		isReported: () => reported,
	}
}

export type LoadTracker<Step extends string> = ReturnType<typeof createLoadTracker<Step>>
