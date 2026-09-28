import { uniqueId } from '@tldraw/utils'
import { getFirstLoadId, wasHiddenSinceNavigation } from './firstLoad'
import {
	createLoadTracker,
	describeLoadFields,
	isLoadStaff,
	type LoadServerTimings,
	type LoadTrackerDeps,
	measureOnTrack,
	SERVER_ECHO_DEADLINE_MS,
	shouldPrintLoads,
	shouldReportLoad,
} from './loadTracker'

/**
 * Per-step timing for every file open in a tab, first load included, so a file switch can be
 * compared with a cold page load.
 */
export const FILE_LOAD_STEPS = [
	'editor-rendered',
	'sync-token-fetched',
	'sync-connected',
	'editor-mounted',
	'board-visible',
] as const
export type FileLoadStep = (typeof FILE_LOAD_STEPS)[number]
export type FileLoadKind = 'first' | 'switch'

export const FILE_LOAD_LOG_HEADER =
	'[file-load] file open timings, printed because the logLoads debug flag is on'

export interface FileLoadsDeps extends LoadTrackerDeps<FileLoadStep> {
	firstLoadId: string
	isHidden(): boolean
	wasHiddenSinceNavigation(): boolean
}

export type FileLoad = ReturnType<ReturnType<typeof createFileLoads>['begin']>

export function createFileLoads(deps: FileLoadsDeps) {
	let navigation: { pathname: string; at: number } | null = null
	let current: ReturnType<typeof open> | null = null
	let opened = 0

	function open(slug: string) {
		const kind: FileLoadKind = opened === 0 ? 'first' : 'switch'
		opened++
		const nav = navigation?.pathname === `/f/${slug}` ? navigation : null
		navigation = null
		const t0 = kind === 'first' ? 0 : (nav?.at ?? deps.now())
		const tracker = createLoadTracker(deps, {
			steps: FILE_LOAD_STEPS,
			t0,
			loadId: kind === 'first' ? deps.firstLoadId : uniqueId(21),
			logPrefix: 'file-load',
			logHeader: FILE_LOAD_LOG_HEADER,
			markPrefix: 'tla-file',
		})
		// A first load's t0 is navigation start, so a tab hidden any time before this file opened
		// (page boot included) must count as hidden, not just hidden at open() time.
		let hidden = deps.isHidden() || (kind === 'first' && deps.wasHiddenSinceNavigation())
		let superseded = false
		return {
			kind,
			slug,
			loadId: tracker.loadId,
			tracker,
			mark: (step: FileLoadStep) => tracker.mark(step),
			connectLoadId: () =>
				tracker.getMarks()['sync-connected'] === undefined ? tracker.loadId : undefined,
			setServerTimings: (msg: LoadServerTimings) => tracker.setServerTimings(msg),
			whenServerTimings: (ms: number) => tracker.whenServerTimings(ms),
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
				const rendered = report.t_editor_rendered
				const visible = report.t_board_visible
				return {
					...flat,
					load_kind: kind,
					// Comparable across kinds: a first open's clock starts at navigation.
					file_ms: rendered !== undefined && visible !== undefined ? visible - rendered : undefined,
					srv_echo: gotEcho,
					...extra,
				}
			},
		}
	}

	return {
		/** Called from the router, before React renders the new route. */
		noteNavigation(pathname: string) {
			if (!pathname.startsWith('/f/')) return
			if (navigation?.pathname === pathname) return
			// A router update for the file already open is not a navigation to it; treating it as one
			// would give a later remount of this same file a stale t0.
			if (current && pathname === `/f/${current.slug}`) return
			navigation = { pathname, at: deps.now() }
		},
		begin(slug: string) {
			if (current?.slug === slug && !current.tracker.isReported() && !current.isSuperseded()) {
				return current
			}
			if (current && !current.tracker.isReported()) current.supersede()
			current = open(slug)
			if (shouldPrintLoads()) current.tracker.enableLiveLog()
			return current
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
	firstLoadId: getFirstLoadId(),
	isHidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
	wasHiddenSinceNavigation,
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
	const print = shouldPrintLoads()
	if (!send && !print) return
	void load.whenServerTimings(SERVER_ECHO_DEADLINE_MS).then((gotEcho) => {
		const event = load.buildEvent(gotEcho, opts.extra)
		if (!event) return
		if (send) opts.trackEvent('file_load', event)
		if (!print) return
		const staff = isLoadStaff(opts.email)
		const server = Object.fromEntries(Object.entries(event).filter(([k]) => k.startsWith('srv_')))
		/* eslint-disable no-console */
		console.groupCollapsed(
			`[file-load] ${load.loadId} ${load.kind} total ${event.total_ms}ms, file ${event.file_ms}ms` +
				(inGate && load.isHidden() ? ', tab was hidden so not sent' : '')
		)
		console.table(
			FILE_LOAD_STEPS.filter((s) => event[`t_${s.replaceAll('-', '_')}`] !== undefined).map(
				(s) => ({
					step: s,
					'ms since start': event[`t_${s.replaceAll('-', '_')}`],
					'delta ms': event[`d_${s.replaceAll('-', '_')}`],
				})
			)
		)
		console.table(staff ? describeLoadFields(server) : server)
		console.groupEnd()
		/* eslint-enable no-console */
	})
}
