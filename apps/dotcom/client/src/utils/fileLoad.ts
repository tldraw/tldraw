import { uniqueId } from '@tldraw/utils'
import {
	type FirstLoadRouteKind,
	getFirstLoadRouteKind,
	isPageBooting,
	wasHiddenSinceNavigation,
} from './firstLoad'
import {
	createLoadTracker,
	describeLoadFields,
	isLoadStaff,
	type LoadServerTimings,
	type LoadTrackerDeps,
	measureOnTrack,
	SERVER_ECHO_DEADLINE_MS,
	serverTables,
	shouldPrintLoads,
	shouldReportLoad,
} from './loadTracker'

/**
 * Per-step timing for every file open in a tab, first load included, so a file switch can be
 * compared with a cold page load.
 */
export const FILE_LOAD_STEPS = [
	'file-started',
	'editor-rendered',
	'sync-token-fetched',
	'sync-connected',
	'editor-mounted',
	'board-visible',
] as const
export type FileLoadStep = (typeof FILE_LOAD_STEPS)[number]

const FILE_LOAD_STEP_INFO: Record<FileLoadStep, string> = {
	'file-started': 'TlaFileSyncHost mounted for this file (file_ms t0)',
	'editor-rendered': 'TlaEditorInner first render',
	'sync-token-fetched': 'Clerk token for the sync socket obtained',
	'sync-connected': 'sync socket open, server checks done, snapshot received and applied',
	'editor-mounted': "editor's onMount ran",
	'board-visible': 'ready shroud lifted; board on screen',
}
// remount: the same file's host mounted again after its board showed (e.g. anon → sign-in).
export type FileLoadKind = 'first' | 'switch' | 'remount'

export const FILE_LOAD_LOG_HEADER =
	'[file-load] file open timings, printed because the logLoads debug flag is on'

export interface FileLoadsDeps extends LoadTrackerDeps<FileLoadStep> {
	/** Until the page's first board shows, a file open is still part of page boot. */
	isPageBooting(): boolean
	isHidden(): boolean
	wasHiddenSinceNavigation(): boolean
	firstRouteKind(): FirstLoadRouteKind
}

export type CachedVisitOutcome = 'accepted' | 'redirect' | 'fallback'

export type FileLoad = ReturnType<ReturnType<typeof createFileLoads>['begin']>

// first_load already prints the first open; printing it twice is noise.
function printsLoad(load: { kind: FileLoadKind }) {
	return load.kind !== 'first' && shouldPrintLoads()
}

export function createFileLoads(deps: FileLoadsDeps) {
	let navigation: { pathname: string; at: number } | null = null
	let current: ReturnType<typeof open> | null = null
	let abandoned = 0
	let cachedVisit: CachedVisitOutcome | undefined

	function abandon(load: ReturnType<typeof open>) {
		load.supersede()
		abandoned++
	}

	function open(slug: string, remount: boolean) {
		const kind: FileLoadKind = remount ? 'remount' : deps.isPageBooting() ? 'first' : 'switch'
		const abandonedBefore = abandoned
		const nav = navigation?.pathname === `/f/${slug}` ? navigation : null
		navigation = null
		const t0 = kind === 'first' ? 0 : (nav?.at ?? deps.now())
		const tracker = createLoadTracker(deps, {
			steps: FILE_LOAD_STEPS,
			t0,
			logPrefix: 'file-load',
			logHeader: FILE_LOAD_LOG_HEADER,
			markPrefix: 'tla-file',
		})
		// A first load's t0 is navigation start, so a tab hidden any time before this file opened
		// (page boot included) must count as hidden, not just hidden at open() time.
		let hidden = deps.isHidden() || (kind === 'first' && deps.wasHiddenSinceNavigation())
		let superseded = false
		// One id per socket, so each echo and server row describes exactly one connect. The load's
		// connect is the socket that got it synced; echoes can land before that is known.
		let latestConnectId: string | undefined
		let connectId: string | undefined
		const echoes = new Map<string, LoadServerTimings>()
		const bootFields = () =>
			kind === 'first'
				? {
						route_kind: deps.firstRouteKind(),
						abandoned_opens: abandonedBefore,
						cached_visit: cachedVisit ?? 'none',
					}
				: {}

		function mark(step: FileLoadStep) {
			if (step === 'sync-connected' && connectId === undefined && latestConnectId) {
				connectId = latestConnectId
				const echo = echoes.get(connectId)
				if (echo) tracker.setServerTimings(echo)
				echoes.clear()
			}
			tracker.mark(step)
		}

		return {
			kind,
			slug,
			loadId: tracker.loadId,
			tracker,
			mark,
			/** A fresh id for each connect attempt until sync-connected; later reconnects are not the load. */
			nextConnectId() {
				if (tracker.getMarks()['sync-connected'] !== undefined) return undefined
				latestConnectId = uniqueId(21)
				return latestConnectId
			},
			connectId: () => connectId,
			setServerTimings(msg: LoadServerTimings) {
				if (connectId === undefined) echoes.set(msg.loadId, msg)
				else if (msg.loadId === connectId) tracker.setServerTimings(msg)
			},
			whenServerTimings: (ms: number) => tracker.whenServerTimings(ms),
			getServerTimings: () => tracker.getServerTimings(),
			/**
			 * Boot context, also stamped on first_load. Lets queries drop boots whose total_ms includes
			 * time elsewhere: another landing page, or a user leaving mid-load (abandoned, no cached visit).
			 */
			bootFields,
			isHidden: () => hidden,
			hide: () => {
				hidden = true
			},
			isSuperseded: () => superseded,
			supersede: () => {
				superseded = true
			},
			buildEvent(gotEcho: boolean, extra: Record<string, unknown>): Record<string, unknown> | null {
				const report = tracker.takeReport()
				if (!report) return null
				const { steps: _steps, ...flat } = report
				const started = report.t_file_started
				const visible = report.t_board_visible
				return {
					...flat,
					load_kind: kind,
					connect_id: connectId,
					...bootFields(),
					// Comparable across kinds: a first open's clock starts at navigation, and its socket can
					// connect before the editor renders, so measure from the sync host mounting.
					file_ms: started !== undefined && visible !== undefined ? visible - started : undefined,
					srv_echo: gotEcho,
					...extra,
				}
			},
		}
	}

	return {
		/** Called from the router, before React renders the new route. */
		noteNavigation(pathname: string) {
			// Exact match: /f/:slug/history is a separate page, so going there leaves the file too.
			if (!/^\/f\/[^/]+\/?$/.test(pathname)) {
				// Leaving before board-visible abandons the open so it never reports; dropping it makes a
				// return start fresh instead of resuming with the old t0 and marks.
				if (current && current.tracker.getMarks()['board-visible'] === undefined) abandon(current)
				current = null
				navigation = null
				return
			}
			if (navigation?.pathname === pathname) return
			// A router update for the file already open is not a navigation to it; treating it as one
			// would give a later remount of this same file a stale t0.
			if (current && pathname === `/f/${current.slug}`) return
			navigation = { pathname, at: deps.now() }
		},
		/**
		 * A same-file remount (e.g. anon → sign-in swaps layouts) reuses the load until its board is
		 * visible, and gets a fresh one after: mark() keeps each step's first time, so a reused load
		 * would drop every step of the remount.
		 */
		begin(slug: string) {
			const unfinished = current && current.tracker.getMarks()['board-visible'] === undefined
			if (current?.slug === slug && unfinished && !current.isSuperseded()) return current
			const remount = current?.slug === slug && !unfinished
			if (current && unfinished) abandon(current)
			current = open(slug, remount)
			if (printsLoad(current)) current.tracker.enableLiveLog()
			return current
		},
		/** Lets boot rows separate a cache-miss boot from a user leaving mid-load (abandoned_opens). */
		noteCachedVisit(outcome: CachedVisitOutcome) {
			cachedVisit ??= outcome
		},
		current: () => current,
		onHidden() {
			current?.hide()
		},
	}
}

export const fileLoads = createFileLoads({
	now: () => performance.now(),
	mark: (name) => {
		try {
			performance.mark(name)
		} catch {
			// marks are best effort
		}
	},
	measure: measureOnTrack('File load'),
	// eslint-disable-next-line no-console
	log: (line) => console.log(line),
	isPageBooting,
	isHidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
	wasHiddenSinceNavigation,
	firstRouteKind: getFirstLoadRouteKind,
})

if (typeof document !== 'undefined') {
	;(window as any).__fileLoads = fileLoads
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') fileLoads.onHidden()
	})
}

export function reportFileLoad(
	load: FileLoad,
	opts: {
		email: string | null | undefined
		flagEnabled: boolean
		trackEvent(name: string, data: Record<string, unknown>): void
		extra: Record<string, unknown>
	}
) {
	if (load.isSuperseded()) return
	const inGate = shouldReportLoad(opts)
	const send = inGate && !load.isHidden()
	const print = printsLoad(load)
	if (!send && !print) return
	void load.whenServerTimings(SERVER_ECHO_DEADLINE_MS).then((gotEcho) => {
		const event = load.buildEvent(gotEcho, opts.extra)
		if (!event) return
		if (send) opts.trackEvent('file_load', event)
		if (!print) return
		const staff = isLoadStaff(opts.email)
		const server = serverTables(event, staff)
		/* eslint-disable no-console */
		console.groupCollapsed(
			`[file-load] ${load.loadId} ${load.kind} total ${event.total_ms}ms, file ${event.file_ms}ms` +
				(event.connect_id ? `, connect_id ${event.connect_id}` : '') +
				(inGate && load.isHidden() ? ', tab was hidden so not sent' : '')
		)
		console.table(
			FILE_LOAD_STEPS.filter((s) => event[`t_${s.replaceAll('-', '_')}`] !== undefined).map(
				(s) => ({
					step: s,
					'ms since start': event[`t_${s.replaceAll('-', '_')}`],
					'delta ms': event[`d_${s.replaceAll('-', '_')}`],
					...(staff && { what: FILE_LOAD_STEP_INFO[s] }),
				})
			)
		)
		console.table(server.steps)
		console.table(staff ? describeLoadFields(server.other) : server.other)
		console.groupEnd()
		/* eslint-enable no-console */
	})
}
