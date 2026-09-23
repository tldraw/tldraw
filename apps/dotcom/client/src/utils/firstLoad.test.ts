import { describe, expect, it, vi } from 'vitest'
import {
	createFirstLoadTracker,
	initServerTiming,
	shouldReportFirstLoad,
	summarizeNavigation,
	summarizeResources,
	type FirstLoadDeps,
} from './firstLoad'

function makeDeps(overrides: Partial<FirstLoadDeps> = {}) {
	let t = 0
	const deps: FirstLoadDeps = {
		now: () => t,
		mark: vi.fn(),
		measure: vi.fn(),
		log: vi.fn(),
		initialPath: '/f/abc',
		...overrides,
	}
	return { deps, advance: (ms: number) => (t += ms) }
}

describe('createFirstLoadTracker', () => {
	it('mints a url-safe load id of usable length', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		expect(tracker.loadId).toMatch(/^[A-Za-z0-9_-]{8,32}$/)
	})

	it('measures each step as a span from the previous one, on its own devtools track', () => {
		const { deps, advance } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		advance(100)
		tracker.mark('js-started')
		advance(400)
		tracker.mark('clerk-loaded')
		expect(deps.measure).toHaveBeenNthCalledWith(1, 'js-started', 0, 100)
		expect(deps.measure).toHaveBeenNthCalledWith(2, 'clerk-loaded', 100, 500)
	})

	it('records the first time a step is marked and ignores later marks of the same step', () => {
		const { deps, advance } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		advance(120)
		tracker.mark('clerk-loaded')
		advance(500)
		tracker.mark('clerk-loaded')
		expect(tracker.getMarks()).toEqual({ 'clerk-loaded': 120 })
		expect(deps.mark).toHaveBeenCalledTimes(1)
		expect(deps.mark).toHaveBeenCalledWith('tla:clerk-loaded')
	})

	it('builds a report with absolute times, deltas from the previous step, and the load id', () => {
		const { deps, advance } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		advance(100)
		tracker.mark('js-started')
		advance(900)
		tracker.mark('clerk-loaded')
		advance(300)
		tracker.mark('board-visible')
		const report = tracker.buildReport()
		expect(report).toMatchObject({
			load_id: tracker.loadId,
			route_kind: 'file',
			t_js_started: 100,
			t_clerk_loaded: 1000,
			t_board_visible: 1300,
			d_clerk_loaded: 900,
			d_board_visible: 300,
			total_ms: 1300,
		})
		expect(report.steps).toEqual([
			{ step: 'js-started', t: 100, delta: 100 },
			{ step: 'clerk-loaded', t: 1000, delta: 900 },
			{ step: 'board-visible', t: 1300, delta: 300 },
		])
	})

	it('orders steps by when they happened, not by the step list', () => {
		const { deps, advance } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		advance(100)
		tracker.mark('root-chunk-loaded')
		advance(10)
		tracker.mark('file-chunk-loaded')
		advance(50)
		tracker.mark('clerk-loaded')
		expect(tracker.buildReport().steps).toEqual([
			{ step: 'root-chunk-loaded', t: 100, delta: 100 },
			{ step: 'file-chunk-loaded', t: 110, delta: 10 },
			{ step: 'clerk-loaded', t: 160, delta: 50 },
		])
	})

	it('classifies a load that started on the root path as a root redirect', () => {
		const { deps } = makeDeps({ initialPath: '/' })
		expect(createFirstLoadTracker(deps).buildReport().route_kind).toBe('root-redirect')
	})

	it('reports only once per page load', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		tracker.mark('board-visible')
		expect(tracker.takeReport()).not.toBeNull()
		expect(tracker.takeReport()).toBeNull()
	})

	it('logs each step live once live logging is enabled, flushing earlier steps first', () => {
		const log = vi.fn()
		const { deps, advance } = makeDeps({ log })
		const tracker = createFirstLoadTracker(deps)
		advance(50)
		tracker.mark('js-started')
		advance(200)
		tracker.mark('clerk-loaded')
		expect(log).not.toHaveBeenCalled()
		tracker.enableLiveLog()
		expect(log.mock.calls.map((c) => c[0])).toEqual([
			'[first-load] js-started +50ms (+50)',
			'[first-load] clerk-loaded +250ms (+200)',
		])
		advance(100)
		tracker.mark('flags-loaded')
		expect(log).toHaveBeenLastCalledWith('[first-load] flags-loaded +350ms (+100)')
	})

	it('stays silent when live logging was never enabled', () => {
		const { deps } = makeDeps()
		createFirstLoadTracker(deps).mark('js-started')
		expect(deps.log).not.toHaveBeenCalled()
	})
})

describe('server timings', () => {
	it('folds the sync server echo into the report as srv_ fields', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		tracker.setServerTimings({
			type: 'first_load_server',
			loadId: tracker.loadId,
			cold: true,
			auth_ms: 12,
			file_record_ms: 170,
			get_room_ms: 540,
			total_ms: 730,
			boot_r2_ms: 80,
			boot_comments_ms: 510,
			boot_total_ms: 530,
		})
		expect(tracker.buildReport()).toMatchObject({
			srv_cold: true,
			srv_auth_ms: 12,
			srv_file_record_ms: 170,
			srv_get_room_ms: 540,
			srv_total_ms: 730,
			srv_boot_r2_ms: 80,
			srv_boot_comments_ms: 510,
			srv_boot_total_ms: 530,
		})
	})

	it('keeps the first echo when a reconnect sends a second one', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		const echo = (cold: boolean) => ({
			type: 'first_load_server' as const,
			loadId: tracker.loadId,
			cold,
			auth_ms: 1,
			get_room_ms: 1,
			total_ms: 1,
		})
		tracker.setServerTimings(echo(true))
		tracker.setServerTimings(echo(false))
		expect(tracker.buildReport().srv_cold).toBe(true)
	})

	it('ignores an echo for a different load', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		tracker.setServerTimings({
			type: 'first_load_server',
			loadId: 'someone-elses-load',
			cold: false,
			auth_ms: 1,
			get_room_ms: 1,
			total_ms: 1,
		})
		expect(tracker.buildReport()).not.toHaveProperty('srv_total_ms')
	})

	it('resolves the wait as soon as the echo lands, or at the deadline without it', async () => {
		vi.useFakeTimers()
		try {
			const { deps } = makeDeps()
			const tracker = createFirstLoadTracker(deps)
			const early = vi.fn()
			void tracker.whenServerTimings(3000).then(early)
			tracker.setServerTimings({
				type: 'first_load_server',
				loadId: tracker.loadId,
				cold: false,
				auth_ms: 1,
				get_room_ms: 1,
				total_ms: 1,
			})
			await vi.advanceTimersByTimeAsync(0)
			expect(early).toHaveBeenCalledWith(true)

			const late = vi.fn()
			void createFirstLoadTracker(makeDeps().deps).whenServerTimings(3000).then(late)
			await vi.advanceTimersByTimeAsync(2999)
			expect(late).not.toHaveBeenCalled()
			await vi.advanceTimersByTimeAsync(1)
			expect(late).toHaveBeenCalledWith(false)
		} finally {
			vi.useRealTimers()
		}
	})

	it('reads the init request duration from its Server-Timing entry', () => {
		const entries = [
			{
				name: 'https://www.tldraw.com/api/app/user_x/init',
				serverTiming: [{ name: 'init', duration: 187, description: 'existing' }],
			},
			{ name: 'https://www.tldraw.com/api/app/feature-flags', serverTiming: [] },
		] as unknown as PerformanceResourceTiming[]
		expect(initServerTiming(entries)).toEqual({ srv_init_ms: 187, srv_init_outcome: 'existing' })
		expect(initServerTiming([])).toEqual({})
	})
})

describe('shouldReportFirstLoad', () => {
	it('reports for tldraw.com accounts regardless of the flag', () => {
		expect(shouldReportFirstLoad({ email: 'someone@tldraw.com', flagEnabled: false })).toBe(true)
	})
	it('reports for other accounts only when the flag is on for them', () => {
		expect(shouldReportFirstLoad({ email: 'someone@example.com', flagEnabled: false })).toBe(false)
		expect(shouldReportFirstLoad({ email: 'someone@example.com', flagEnabled: true })).toBe(true)
	})
	it('does not report anonymous loads unless the flag says so', () => {
		expect(shouldReportFirstLoad({ email: null, flagEnabled: false })).toBe(false)
		expect(shouldReportFirstLoad({ email: undefined, flagEnabled: false })).toBe(false)
	})
	it('is not fooled by a tldraw.com substring elsewhere in the address', () => {
		expect(shouldReportFirstLoad({ email: 'tldraw.com@example.com', flagEnabled: false })).toBe(
			false
		)
	})
})

describe('summarizeResources', () => {
	const entry = (name: string, o: Partial<PerformanceResourceTiming> = {}) =>
		({
			name,
			initiatorType: 'script',
			startTime: 0,
			duration: 10,
			transferSize: 1024,
			encodedBodySize: 1024,
			...o,
		}) as PerformanceResourceTiming

	it('totals count and transfer size by kind and picks out the clerk script', () => {
		const summary = summarizeResources([
			entry('https://www.tldraw.com/assets/index-abc.js', { transferSize: 100 * 1024 }),
			entry('https://www.tldraw.com/assets/a.css', {
				initiatorType: 'link',
				transferSize: 10 * 1024,
			}),
			entry('https://www.tldraw.com/assets/f.woff2', {
				initiatorType: 'css',
				transferSize: 50 * 1024,
			}),
			entry('https://clerk.tldraw.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js', {
				startTime: 1000,
				duration: 3500,
				transferSize: 0,
			}),
			entry('https://www.tldraw.com/api/app/feature-flags', {
				initiatorType: 'fetch',
				transferSize: 2 * 1024,
			}),
		])
		expect(summary).toEqual({
			res_count: 5,
			res_kb: 162,
			res_js_kb: 100,
			res_css_kb: 10,
			res_font_kb: 50,
			res_fetch_kb: 2,
			res_cached: 1,
			res_largest: 'assets/index-abc.js',
			res_largest_kb: 100,
			res_slowest: 'clerk.tldraw.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js',
			res_slowest_ms: 3500,
			clerk_script_ms: 3500,
		})
	})

	it('never names a user-content asset, only its host', () => {
		const summary = summarizeResources([
			entry('https://www.tldraw.com/assets/index-abc.js', { transferSize: 10 * 1024 }),
			entry(
				'https://tldrawusercontent.com/cdn-cgi/image/format=auto/yU-ezq-xjZQ8dJfgUkaGV-Screenshot-2025-08-29-at-10-26-30-png',
				{ initiatorType: 'img', transferSize: 900 * 1024, duration: 4000 }
			),
			entry('https://clerk.tldraw.com/v1/client', { initiatorType: 'fetch', duration: 250 }),
		])
		expect(summary.res_largest).toBe('tldrawusercontent.com')
		expect(summary.res_slowest).toBe('tldrawusercontent.com')
		expect(JSON.stringify(summary)).not.toContain('Screenshot')
	})

	it('handles an empty list', () => {
		expect(summarizeResources([])).toMatchObject({ res_count: 0, res_kb: 0, clerk_script_ms: null })
	})
})

describe('summarizeNavigation', () => {
	function nav(overrides: Partial<PerformanceNavigationTiming> = {}) {
		return {
			type: 'navigate',
			nextHopProtocol: 'h3',
			redirectCount: 0,
			activationStart: 0,
			workerStart: 0,
			fetchStart: 5,
			domainLookupStart: 5,
			domainLookupEnd: 5,
			connectStart: 5,
			connectEnd: 5,
			requestStart: 6,
			responseStart: 90.4,
			domContentLoadedEventEnd: 300,
			...overrides,
		} as PerformanceNavigationTiming
	}

	it('splits time to first byte into its phases', () => {
		expect(
			summarizeNavigation(
				nav({
					fetchStart: 120,
					domainLookupStart: 121,
					domainLookupEnd: 151,
					connectStart: 151,
					connectEnd: 211,
					requestStart: 212,
					responseStart: 1712.6,
				})
			)
		).toEqual({
			nav_type: 'navigate',
			nav_ttfb: 1713,
			nav_dom_content_loaded: 300,
			nav_protocol: 'h3',
			nav_redirect_count: 0,
			nav_fetch_start: 120,
			nav_worker_ms: 0,
			nav_dns_ms: 30,
			nav_connect_ms: 60,
			nav_server_ms: 1501,
			nav_activation_start: 0,
		})
	})

	it('reports service worker startup only when a worker handled the navigation', () => {
		expect(summarizeNavigation(nav()).nav_worker_ms).toBe(0)
		expect(summarizeNavigation(nav({ workerStart: 10, fetchStart: 410 })).nav_worker_ms).toBe(400)
	})

	it('reports zero for phases the browser skipped or hid', () => {
		expect(
			summarizeNavigation(
				nav({
					domainLookupStart: 0,
					domainLookupEnd: 0,
					connectStart: 0,
					connectEnd: 0,
					requestStart: 0,
					responseStart: 0,
				})
			)
		).toMatchObject({ nav_dns_ms: 0, nav_connect_ms: 0, nav_server_ms: 0 })
	})
})
