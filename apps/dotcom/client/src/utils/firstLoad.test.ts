import { describe, expect, it, vi } from 'vitest'
import {
	createFirstLoadTracker,
	FIRST_LOAD_LOG_HEADER,
	initServerTiming,
	reportFirstLoad,
	serverTotalMs,
	summarizeNavigation,
	summarizeResources,
	type FirstLoadDeps,
} from './firstLoad'
import type { LoadServerTimings } from './loadTracker'

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

	it('measures each step from where its own flow started, on that flow lane', () => {
		const { deps, advance } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		advance(100)
		tracker.mark('js-started')
		advance(400)
		tracker.mark('clerk-loaded')
		advance(50)
		tracker.mark('flags-loaded')
		advance(50)
		tracker.mark('sync-token-fetched')
		advance(300)
		tracker.mark('zero-user-synced')
		expect(deps.measure).toHaveBeenNthCalledWith(1, 'js-started', 0, 100, 'Page', 'start')
		expect(deps.measure).toHaveBeenNthCalledWith(
			2,
			'clerk-loaded',
			100,
			500,
			'Page',
			'previous step'
		)
		expect(deps.measure).toHaveBeenNthCalledWith(
			3,
			'flags-loaded',
			500,
			550,
			'Page',
			'clerk-loaded'
		)
		expect(deps.measure).toHaveBeenNthCalledWith(
			4,
			'sync-token-fetched',
			500,
			600,
			'Sync',
			'clerk-loaded'
		)
		expect(deps.measure).toHaveBeenNthCalledWith(
			5,
			'zero-user-synced',
			550,
			900,
			'Zero',
			'flags-loaded'
		)
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

	it('classifies a load that started on a file history page as other', () => {
		const { deps } = makeDeps({ initialPath: '/f/abc/history' })
		expect(createFirstLoadTracker(deps).buildReport().route_kind).toBe('other')
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
			FIRST_LOAD_LOG_HEADER,
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
	it('folds the sync server echo, step marks included, into the report as srv_ fields', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		tracker.setServerTimings({
			type: 'first_load_server',
			loadId: tracker.loadId,
			cold: true,
			edge_colo: 'FRA',
			pg_via: 'hyperdrive',
			boot_r2_ms: 80,
			boot_comments_ms: 510,
			d_auth: 12,
			t_auth: 12,
			d_boot: 530,
			t_boot: 542,
			d_handshake: 90,
			t_handshake: 632,
		})
		expect(tracker.buildReport()).toMatchObject({
			srv_cold: true,
			srv_edge_colo: 'FRA',
			srv_pg_via: 'hyperdrive',
			srv_boot_r2_ms: 80,
			srv_d_auth: 12,
			srv_t_boot: 542,
			srv_d_handshake: 90,
			srv_t_handshake: 632,
		})
	})

	it('takes the server total from the latest step', () => {
		expect(
			serverTotalMs({
				type: 'first_load_server',
				loadId: 'x'.repeat(21),
				cold: false,
				t_auth: 12,
				t_handshake: 632,
				d_handshake: 90,
			})
		).toBe(632)
		expect(
			serverTotalMs({ type: 'first_load_server', loadId: 'x'.repeat(21), cold: false })
		).toBeUndefined()
	})

	it('keeps the first echo when a reconnect sends a second one', () => {
		const { deps } = makeDeps()
		const tracker = createFirstLoadTracker(deps)
		const echo = (cold: boolean) => ({
			type: 'first_load_server' as const,
			loadId: tracker.loadId,
			cold,
			d_auth: 1,
			t_auth: 1,
		})
		tracker.setServerTimings(echo(true))
		tracker.setServerTimings(echo(false))
		expect(tracker.buildReport().srv_cold).toBe(true)
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
				d_auth: 1,
				t_auth: 1,
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
			nav_dns_ms: 30,
			nav_connect_ms: 60,
			nav_server_ms: 1501,
			nav_activation_start: 0,
		})
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

describe('reportFirstLoad', () => {
	it("waits for the adopted file load's echo and carries its ids, boot fields and extras", async () => {
		const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
		let echo: LoadServerTimings | null = null
		let wake: (gotEcho: boolean) => void = () => {}
		const trackEvent = vi.fn()
		reportFirstLoad({
			email: 'someone@tldraw.com',
			flagEnabled: false,
			trackEvent,
			fileLoad: {
				loadId: 'file-load-id',
				connectId: () => 'connect-id',
				bootFields: () => ({ abandoned_opens: 1, cached_visit: 'redirect' }),
				whenServerTimings: () => new Promise((resolve) => (wake = resolve)),
				getServerTimings: () => echo,
			},
			extra: { page_shapes: 12, records: 40 },
		})
		await flush()
		expect(trackEvent).not.toHaveBeenCalled()
		echo = { type: 'first_load_server', loadId: 'connect-id', cold: true, d_auth: 5, t_auth: 5 }
		wake(true)
		await flush()
		expect(trackEvent).toHaveBeenCalledWith(
			'first_load',
			expect.objectContaining({
				file_load_id: 'file-load-id',
				connect_id: 'connect-id',
				abandoned_opens: 1,
				cached_visit: 'redirect',
				srv_cold: true,
				srv_t_auth: 5,
				srv_echo: true,
				page_shapes: 12,
				records: 40,
			})
		)
	})
})
