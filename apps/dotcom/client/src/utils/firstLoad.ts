import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { uniqueId } from 'tldraw'

export type FirstLoadServerTimings = Extract<TLCustomServerEvent, { type: 'first_load_server' }>

/**
 * Per-step timing for the first load of a page, from navigation start to the board being visible.
 *
 * Every step names the event that just completed, in past tense; its span is the time since the
 * previous step. Steps become `performance.mark`s (`tla:<step>`) and measures, `t_<step>` /
 * `d_<step>` properties on the `first_load` analytics event, and console lines. The report sorts
 * by when each step actually happened, since route chunks load in parallel.
 *
 * | step                 | the moment it marks                                                   |
 * |----------------------|-----------------------------------------------------------------------|
 * | js-started           | main.tsx began executing (HTML + entry bundle done)                   |
 * | root-chunk-loaded    | the TlaRootProviders route chunk was evaluated                        |
 * | clerk-loaded         | Clerk reported `isLoaded` (session known)                             |
 * | flags-loaded         | feature flags resolved, or timed out to defaults                      |
 * | init-done            | `POST /api/app/:id/init` returned                                     |
 * | zero-user-synced     | Zero confirmed the user row from the server                           |
 * | zero-preloaded       | Zero confirmed file states + workspace memberships; app state unblocks|
 * | file-chunk-loaded    | the file route chunk was evaluated                                    |
 * | editor-rendered      | TlaEditorInner rendered for the first time (`room_load_duration` t0)  |
 * | sync-token-fetched   | Clerk token for the sync socket obtained                              |
 * | sync-connected       | the sync store reached `synced-remote`                                |
 * | editor-mounted       | the editor's `onMount` ran                                            |
 * | board-visible        | the ready shroud lifted; the board is on screen                       |
 *
 * How to read the output: tldraw-internal #2026.
 */
export const FIRST_LOAD_STEPS = [
	'js-started',
	'root-chunk-loaded',
	'clerk-loaded',
	'flags-loaded',
	'init-done',
	'zero-user-synced',
	'zero-preloaded',
	'file-chunk-loaded',
	'editor-rendered',
	'sync-token-fetched',
	'sync-connected',
	'editor-mounted',
	'board-visible',
] as const

export type FirstLoadStep = (typeof FIRST_LOAD_STEPS)[number]

export interface FirstLoadDeps {
	now(): number
	mark(name: string): void
	measure(step: FirstLoadStep, start: number, end: number): void
	log(line: string): void
	initialPath: string
}

export interface FirstLoadStepRow {
	step: FirstLoadStep
	t: number
	delta: number
}

export interface FirstLoadReport {
	load_id: string
	route_kind: 'root-redirect' | 'file' | 'other'
	steps: FirstLoadStepRow[]
	total_ms: number
	[key: `t_${string}`]: number | undefined
	[key: `d_${string}`]: number | undefined
	[key: `srv_${string}`]: number | boolean | undefined
}

export function createFirstLoadTracker(deps: FirstLoadDeps) {
	const loadId = uniqueId(21)
	const marks: Partial<Record<FirstLoadStep, number>> = {}
	let lastT = 0
	let reported = false
	let server: FirstLoadServerTimings | null = null
	const serverWaiters: Array<() => void> = []
	// Live lines are buffered until enableLiveLog(): the gate (a @tldraw.com account) is only
	// known once Clerk has loaded, well after the first steps.
	let live = false
	const lines: string[] = []

	function say(line: string) {
		if (live) deps.log(line)
		else lines.push(line)
	}

	const routeKind = (): FirstLoadReport['route_kind'] => {
		if (deps.initialPath === '/') return 'root-redirect'
		if (deps.initialPath.startsWith('/f/')) return 'file'
		return 'other'
	}

	function mark(step: FirstLoadStep) {
		if (step in marks) return
		const t = Math.round(deps.now())
		marks[step] = t
		deps.mark(`tla:${step}`)
		deps.measure(step, lastT, t)
		say(`[first-load] ${step} +${t}ms (+${t - lastT})`)
		lastT = t
	}

	function buildReport(): FirstLoadReport {
		// Sorted by when each step happened, not by the list: the router fetches both route chunks in
		// parallel, so file-chunk-loaded regularly lands before clerk-loaded.
		const seen = FIRST_LOAD_STEPS.filter((step) => marks[step] !== undefined).sort(
			(a, b) => marks[a]! - marks[b]!
		)
		const steps: FirstLoadStepRow[] = []
		let prev = 0
		for (const step of seen) {
			const t = marks[step]!
			steps.push({ step, t, delta: t - prev })
			prev = t
		}
		const report: FirstLoadReport = {
			load_id: loadId,
			route_kind: routeKind(),
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
	function setServerTimings(msg: FirstLoadServerTimings) {
		if (msg.loadId !== loadId) return
		// A reconnect inside the report window sends a second, warm echo; the first one is the load.
		if (server) return
		server = msg
		for (const wake of serverWaiters.splice(0)) wake()
		say(
			`[first-load] server: ${msg.cold ? 'cold' : 'warm'} room, request ${msg.total_ms}ms` +
				(msg.boot_total_ms !== undefined ? `, boot ${msg.boot_total_ms}ms` : '')
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
		for (const line of lines.splice(0)) deps.log(line)
	}

	function takeReport(): FirstLoadReport | null {
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
	}
}

/** The `Server-Timing` header the init route sets, read off its resource timing entry. */
export function initServerTiming(entries: readonly PerformanceResourceTiming[]) {
	const init = entries.find((e) => /\/api\/app\/[^/]+\/init(\?|$)/.test(e.name))
	const timing = init?.serverTiming?.find((t) => t.name === 'init')
	if (!timing) return {}
	return { srv_init_ms: Math.round(timing.duration), srv_init_outcome: timing.description }
}

/** Staff always; everyone else through the `first_load_rum` percentage flag (0% by default). */
export function shouldReportFirstLoad({
	email,
	flagEnabled,
}: {
	email: string | null | undefined
	flagEnabled: boolean
}) {
	return isFirstLoadStaff(email) || flagEnabled
}

const kb = (bytes: number) => Math.round(bytes / 1024)

/**
 * What the report may call a resource. Our own build assets and the app's API/auth hosts are
 * named by path; anything else, notably user uploads on tldrawusercontent.com whose keys carry the
 * original filename, collapses to its host so no user content reaches analytics.
 */
function shortName(url: string) {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return 'unknown'
	}
	const { host, pathname } = parsed
	const isOwnApp =
		host === 'www.tldraw.com' || host === 'tldraw.com' || host.startsWith('localhost')
	if (isOwnApp && (pathname.startsWith('/assets/') || pathname.startsWith('/api/'))) {
		return pathname.replace(/^\//, '').replace(/\/user_[^/]+/, '/user_x')
	}
	if (host.startsWith('clerk.') || host.endsWith('.clerk.accounts.dev')) {
		return `${host}${pathname.replace(/\/sess_[^/]+/, '/sess_x')}`
	}
	return host
}

export function summarizeResources(entries: readonly PerformanceResourceTiming[]) {
	let total = 0
	let js = 0
	let css = 0
	let font = 0
	let fetchBytes = 0
	let cached = 0
	let largest: PerformanceResourceTiming | null = null
	let slowest: PerformanceResourceTiming | null = null
	let clerkScriptMs: number | null = null
	for (const e of entries) {
		const bytes = e.transferSize || 0
		total += bytes
		// transferSize is 0 for cache hits and for cross-origin responses without
		// Timing-Allow-Origin, so this over-counts "cached" for third parties; good enough.
		if (bytes === 0) cached++
		const path = e.name.replace(/\?.*$/, '')
		if (/\.(m?js)$/.test(path)) js += bytes
		else if (/\.css$/.test(path)) css += bytes
		else if (/\.(woff2?|ttf|otf)$/.test(path)) font += bytes
		else if (e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest')
			fetchBytes += bytes
		if (!largest || bytes > (largest.transferSize || 0)) largest = e
		if (!slowest || e.duration > slowest.duration) slowest = e
		if (/clerk\.browser\.js/.test(path)) clerkScriptMs = Math.round(e.duration)
	}
	return {
		res_count: entries.length,
		res_kb: kb(total),
		res_js_kb: kb(js),
		res_css_kb: kb(css),
		res_font_kb: kb(font),
		res_fetch_kb: kb(fetchBytes),
		res_cached: cached,
		res_largest: largest ? shortName(largest.name) : null,
		res_largest_kb: largest ? kb(largest.transferSize || 0) : 0,
		res_slowest: slowest ? shortName(slowest.name) : null,
		res_slowest_ms: slowest ? Math.round(slowest.duration) : 0,
		clerk_script_ms: clerkScriptMs,
	}
}

/** The one tracker for this page load. Marks after the report is taken are ignored. */
export const firstLoad = createFirstLoadTracker({
	now: () => performance.now(),
	mark: (name) => {
		try {
			performance.mark(name)
		} catch {
			// marks are best effort
		}
	},
	measure: (step, start, end) => {
		try {
			// `detail.devtools` is Chrome's Performance panel extension: it puts the span on its own
			// "First load" track instead of the generic Timings track, where bare marks are just ticks.
			performance.measure(`tla:${step}`, {
				start,
				end,
				detail: {
					devtools: {
						dataType: 'track-entry',
						track: 'First load',
						color: 'primary',
						tooltipText: `${step}: ${Math.round(end - start)}ms since previous step`,
					},
				},
			})
		} catch {
			// measures are best effort
		}
	},
	// eslint-disable-next-line no-console
	log: (line) => console.log(line),
	initialPath: typeof window === 'undefined' ? '' : window.location.pathname,
})

if (typeof window !== 'undefined') {
	;(window as any).__firstLoad = firstLoad
	// The default buffer holds 250 resource entries; a board load is ~180 in production and far
	// more in dev, and once it overflows the init request and later assets vanish from the summary.
	try {
		performance.setResourceTimingBufferSize(2000)
	} catch {
		// best effort
	}
	// Anonymous or non-staff sessions can opt in per load; staff accounts are enabled from
	// useAppState as soon as Clerk says who they are.
	if (window.location.search.includes('firstLoadDebug')) firstLoad.enableLiveLog()
}

/** Live console lines for this load, replaying the steps already recorded. */
export function enableFirstLoadLiveLog() {
	firstLoad.enableLiveLog()
}

export function isFirstLoadStaff(email: string | null | undefined) {
	return !!email?.endsWith('@tldraw.com')
}

export function markFirstLoad(step: FirstLoadStep) {
	firstLoad.mark(step)
}

/** The id the server can join on: sent on the sync socket URL and the init request. */
export function getFirstLoadId() {
	return firstLoad.loadId
}

export function hasFirstLoadStep(step: FirstLoadStep) {
	return firstLoad.getMarks()[step] !== undefined
}

function navigationTiming() {
	const nav = performance.getEntriesByType('navigation')[0] as
		| PerformanceNavigationTiming
		| undefined
	if (!nav) return {}
	return {
		nav_type: nav.type,
		nav_ttfb: Math.round(nav.responseStart),
		nav_dom_content_loaded: Math.round(nav.domContentLoadedEventEnd),
		nav_protocol: nav.nextHopProtocol,
	}
}

// LCP is only delivered through an observer (getEntriesByType warns and returns nothing), and the
// candidate can keep moving until first input, so keep the latest one.
let lcpMs: number | undefined
if (typeof PerformanceObserver !== 'undefined') {
	try {
		new PerformanceObserver((list) => {
			const last = list.getEntries().at(-1)
			if (last) lcpMs = Math.round(last.startTime)
		}).observe({ type: 'largest-contentful-paint', buffered: true })
	} catch {
		// unsupported browser
	}
}

function paintTiming() {
	const out: Record<string, number> = {}
	for (const p of performance.getEntriesByType('paint')) {
		out[p.name === 'first-contentful-paint' ? 'fcp' : 'first_paint'] = Math.round(p.startTime)
	}
	if (lcpMs !== undefined) out.lcp = lcpMs
	return out
}

/**
 * Sends the `first_load` event once, if this account is in the gate, and prints the same tables
 * to the console: a flagged user can paste them into a support thread, and staff can read a load
 * without waiting for PostHog.
 */
const SERVER_ECHO_DEADLINE_MS = 3000

export function reportFirstLoad(opts: {
	email: string | null | undefined
	flagEnabled: boolean
	trackEvent(name: string, data: Record<string, unknown>): void
}) {
	if (!shouldReportFirstLoad(opts)) return
	// One report per load, so wait briefly for the server echo rather than dropping the srv_ fields.
	// Snapshot the page-side numbers now: by the time the echo wait ends, images the board loads
	// after it became visible would otherwise be counted as first-load resources.
	const snapshot = {
		entries: (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).slice(),
		nav: navigationTiming(),
		paint: paintTiming(),
	}
	void firstLoad
		.whenServerTimings(SERVER_ECHO_DEADLINE_MS)
		.then((gotEcho) => sendFirstLoadReport(opts, gotEcho, snapshot))
}

function sendFirstLoadReport(
	opts: { trackEvent(name: string, data: Record<string, unknown>): void },
	gotEcho: boolean,
	snapshot: {
		entries: PerformanceResourceTiming[]
		nav: ReturnType<typeof navigationTiming>
		paint: ReturnType<typeof paintTiming>
	}
) {
	const report = firstLoad.takeReport()
	if (!report) return null
	const resources = summarizeResources(snapshot.entries)
	const { steps, ...flat } = report
	const event = {
		...flat,
		// false = deadline passed with no echo, which separates a slow server from a rejected id
		srv_echo: gotEcho,
		...initServerTiming(snapshot.entries),
		...snapshot.nav,
		...snapshot.paint,
		...resources,
	}
	opts.trackEvent('first_load', event)
	const server = Object.fromEntries(Object.entries(event).filter(([k]) => k.startsWith('srv_')))
	/* eslint-disable no-console */
	console.log(`[first-load] ${report.load_id} total ${report.total_ms}ms`)
	console.table(steps.map((s) => ({ step: s.step, 'ms since nav': s.t, 'delta ms': s.delta })))
	console.table(server)
	console.table(resources)
	/* eslint-enable no-console */
	return event
}

/** Feed the sync server's echo for this load (see TlaEditor's custom message handler). */
export function setFirstLoadServerTimings(msg: FirstLoadServerTimings) {
	firstLoad.setServerTimings(msg)
}
