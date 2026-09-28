import { getFromSessionStorage } from '@tldraw/utils'
import {
	createLoadTracker,
	LoadReport,
	LoadServerTimings,
	LoadStepRow,
	LoadTrackerDeps,
	serverTotalMs,
} from './loadTracker'

export { serverTotalMs }

export type FirstLoadServerTimings = LoadServerTimings

/**
 * Per-step timing for the first load of a page, from navigation start to the board being visible.
 *
 * Every step names the event that just completed, in past tense; its span is the time since the
 * previous step. Steps become `performance.mark`s (`tla:<step>`) and measures, `t_<step>` /
 * `d_<step>` properties on the `first_load` analytics event, and console lines. The report sorts
 * by when each step actually happened, since route chunks load in parallel. What each step marks
 * is in FIRST_LOAD_STEP_INFO.
 *
 * How to read the output: tldraw/tldraw-internal#2026.
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

const FIRST_LOAD_STEP_INFO: Record<FirstLoadStep, string> = {
	'js-started': 'main.tsx began executing (HTML + entry bundle done)',
	'root-chunk-loaded': 'TlaRootProviders route chunk evaluated',
	'clerk-loaded': 'Clerk reported isLoaded (session known)',
	'flags-loaded': 'feature flags resolved, or timed out to defaults',
	'init-done': 'POST /api/app/:userId/init returned (see srv_init_outcome)',
	'zero-user-synced': 'Zero confirmed the user row from the server',
	'zero-preloaded': 'Zero confirmed file states + workspace memberships; app state unblocks',
	'file-chunk-loaded': 'file route chunk evaluated',
	'editor-rendered': 'TlaEditorInner first render (room_load_duration t0)',
	'sync-token-fetched': 'Clerk token for the sync socket obtained',
	'sync-connected': 'sync socket open, server checks done, snapshot received (synced-remote)',
	'editor-mounted': "editor's onMount ran",
	'board-visible': 'ready shroud lifted; board on screen',
}

const FIRST_LOAD_FIELD_INFO: Record<string, string> = {
	srv_cold: 'no live room in the DO; true alone does not mean an R2/Postgres load (see srv_boot_*)',
	srv_edge_colo: 'Cloudflare colo that received the socket',
	srv_do_colo: 'colo the file room runs in (absent until its one-off lookup resolves)',
	srv_pg_via: 'Postgres path: hyperdrive or pooler',
	srv_connect_bytes: 'length of the connect reply in characters (≈ bytes for ASCII JSON)',
	srv_boot_r2_ms: 'room boot from empty SQLite: R2 snapshot fetch',
	srv_boot_comments_ms:
		'room boot from empty SQLite: comments from Postgres (parallel with the R2 fetch)',
	srv_echo: 'server timings arrived; false = none within 3s of board-visible',
	srv_init_ms: 'sync worker: user init request (Server-Timing)',
	srv_init_outcome:
		'existing (user already set up), created (first sign-in), or a failure: rate_limited, no_clerk_user, no_email; absent if init threw',
	res_count: 'resources loaded by board-visible',
	res_kb: 'total transferred',
	res_js_kb: 'JS transferred',
	res_css_kb: 'CSS transferred',
	res_font_kb: 'fonts transferred',
	res_fetch_kb: 'fetch/XHR transferred',
	res_cached: 'resources with 0 bytes transferred (cache hits, or opaque cross-origin)',
	res_largest: 'largest resource by transfer size',
	res_largest_kb: 'its size',
	res_slowest: 'slowest resource by duration',
	res_slowest_ms: 'its duration',
	clerk_script_ms: 'clerk.browser.js fetch duration',
}

const SERVER_STEP_INFO: Record<string, string> = {
	route: 'worker received the socket → room reached (clocks of two machines, approximate)',
	do_init: 'room woken for this request: constructor → onRequest, incl. the documentInfo read',
	auth: 'verify the Clerk token',
	file_record: 'file row lookup (Postgres)',
	rate_limit: 'rate limiter',
	group_check: 'group role lookup, getRole (Postgres)',
	boot: 'room boot from empty SQLite: R2 + comments (see srv_boot_*)',
	get_room: 'rest of get or create the room',
	handshake:
		'101 → client sends connect → reply goes out (RTT; the reply build is CPU and reads ~0)',
}

function fieldInfo(key: string) {
	const step = /^srv_[dt]_(.+)$/.exec(key)?.[1]
	if (step) return `sync worker step: ${SERVER_STEP_INFO[step] ?? step}`
	return FIRST_LOAD_FIELD_INFO[key] ?? ''
}

export function describeLoadFields(fields: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(fields).map(([k, value]) => [k, { value, what: fieldInfo(k) }])
	)
}

export const FIRST_LOAD_LOG_HEADER =
	'[first-load] page load timings, printed because the logLoads debug flag is on'

/**
 * The debug flag that prints the load to the console; sending to PostHog is gated separately
 * (shouldReportFirstLoad). The flag itself is created in TlaEditor: importing `tldraw` here would
 * pull the SDK into the entry chunk. first_load's own live-log is decided once at module load, so a
 * toggle applies from the next full page load; shouldPrintLoads() reads it fresh, so a toggle also
 * applies from the next file open in this tab.
 */
export const LOADS_DEBUG_FLAG = 'logLoads'
const printLoads = getFromSessionStorage(`tldraw_debug:${LOADS_DEBUG_FLAG}`) === 'true'
export function shouldPrintLoads() {
	return getFromSessionStorage(`tldraw_debug:${LOADS_DEBUG_FLAG}`) === 'true'
}

export type FirstLoadDeps = LoadTrackerDeps<FirstLoadStep> & { initialPath: string }

export type FirstLoadStepRow = LoadStepRow<FirstLoadStep>

export type FirstLoadReport = LoadReport<FirstLoadStep> & {
	route_kind: 'root-redirect' | 'file' | 'other'
}

export function createFirstLoadTracker(deps: FirstLoadDeps) {
	const core = createLoadTracker(deps, {
		steps: FIRST_LOAD_STEPS,
		logPrefix: 'first-load',
		logHeader: FIRST_LOAD_LOG_HEADER,
		markPrefix: 'tla',
	})
	const routeKind = (): FirstLoadReport['route_kind'] => {
		if (deps.initialPath === '/') return 'root-redirect'
		if (deps.initialPath.startsWith('/f/')) return 'file'
		return 'other'
	}
	return {
		...core,
		buildReport: (): FirstLoadReport => ({ ...core.buildReport(), route_kind: routeKind() }),
		takeReport: (): FirstLoadReport | null => {
			const report = core.takeReport()
			return report && { ...report, route_kind: routeKind() }
		},
	}
}

/** The `Server-Timing` header the init route sets, read off its resource timing entry. */
export function initServerTiming(entries: readonly PerformanceResourceTiming[]) {
	const init = entries.find((e) => /\/api\/app\/[^/]+\/init(\?|$)/.test(e.name))
	const timing = init?.serverTiming?.find((t) => t.name === 'init')
	if (!timing) return {}
	return { srv_init_ms: Math.round(timing.duration), srv_init_outcome: timing.description }
}

/** Staff always; everyone else through the `load_rum` percentage flag (0% by default). */
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
	measure: measureOnTrack('First load'),
	// eslint-disable-next-line no-console
	log: (line) => console.log(line),
	initialPath: typeof window === 'undefined' ? '' : window.location.pathname,
})

// Background tabs throttle timers and Zero, so a load that was hidden at any point can take minutes
// and says nothing about load speed. Such loads still print but are not sent.
let hiddenDuringLoad = false

if (typeof window !== 'undefined') {
	;(window as any).__firstLoad = firstLoad
	// The default buffer holds 250 resource entries; a board load is ~180 in production and far
	// more in dev, and once it overflows the init request and later assets vanish from the summary.
	try {
		performance.setResourceTimingBufferSize(2000)
	} catch {
		// best effort
	}
	if (printLoads) firstLoad.enableLiveLog()
	if (document.visibilityState === 'hidden') hiddenDuringLoad = true
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') hiddenDuringLoad = true
	})
}

/** Whether the tab was hidden at any point since navigation start, page boot included. */
export function wasHiddenSinceNavigation(): boolean {
	return hiddenDuringLoad
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

function navigationTiming() {
	const nav = performance.getEntriesByType('navigation')[0] as
		| PerformanceNavigationTiming
		| undefined
	return nav ? summarizeNavigation(nav) : {}
}

/**
 * Splits `nav_ttfb` into the phases that can make it slow. `nav_fetch_start` covers everything
 * before the request, including cross-origin redirects (tldraw.com → www) that `nav_redirect_count`
 * can't see.
 */
export function summarizeNavigation(nav: PerformanceNavigationTiming) {
	const span = (from: number, to: number) => (from > 0 ? Math.round(to - from) : 0)
	return {
		nav_type: nav.type,
		nav_ttfb: Math.round(nav.responseStart),
		nav_dom_content_loaded: Math.round(nav.domContentLoadedEventEnd),
		nav_protocol: nav.nextHopProtocol,
		nav_redirect_count: nav.redirectCount,
		nav_fetch_start: Math.round(nav.fetchStart),
		nav_dns_ms: span(nav.domainLookupStart, nav.domainLookupEnd),
		nav_connect_ms: span(nav.connectStart, nav.connectEnd),
		nav_server_ms: span(nav.requestStart, nav.responseStart),
		// Prerender only, and missing from the DOM lib types.
		nav_activation_start: Math.round(
			(nav as PerformanceNavigationTiming & { activationStart?: number }).activationStart ?? 0
		),
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

export const SERVER_ECHO_DEADLINE_MS = 3000

/**
 * Builds the report once: sent to PostHog if this account is in the gate, printed to the console if
 * the debug flag is on.
 */
export function reportFirstLoad(opts: {
	email: string | null | undefined
	flagEnabled: boolean
	trackEvent(name: string, data: Record<string, unknown>): void
}) {
	const inGate = shouldReportFirstLoad(opts)
	const hidden = hiddenDuringLoad && inGate
	const send = inGate && !hiddenDuringLoad
	const print = printLoads
	if (!send && !print) return
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
		.then((gotEcho) =>
			sendFirstLoadReport(
				{ send, print, hidden, staff: isFirstLoadStaff(opts.email), trackEvent: opts.trackEvent },
				gotEcho,
				snapshot
			)
		)
}

function sendFirstLoadReport(
	opts: {
		send: boolean
		print: boolean
		hidden: boolean
		staff: boolean
		trackEvent(name: string, data: Record<string, unknown>): void
	},
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
	if (opts.send) opts.trackEvent('first_load', event)
	if (!opts.print) return event
	const server = Object.fromEntries(Object.entries(event).filter(([k]) => k.startsWith('srv_')))
	/* eslint-disable no-console */
	console.groupCollapsed(
		`[first-load] ${report.load_id} total ${report.total_ms}ms` +
			(opts.hidden ? ', tab was hidden so not sent' : '') +
			' (expand for steps, server, resources)'
	)
	console.table(
		steps.map((s) => ({
			step: s.step,
			'ms since nav': s.t,
			'delta ms': s.delta,
			...(opts.staff && { what: FIRST_LOAD_STEP_INFO[s.step] }),
		}))
	)
	console.table(opts.staff ? describeLoadFields(server) : server)
	console.table(opts.staff ? describeLoadFields(resources) : resources)
	console.groupEnd()
	/* eslint-enable no-console */
	return event
}

/** Feed the sync server's echo for this load (see TlaEditor's custom message handler). */
export function setFirstLoadServerTimings(msg: FirstLoadServerTimings) {
	firstLoad.setServerTimings(msg)
}
