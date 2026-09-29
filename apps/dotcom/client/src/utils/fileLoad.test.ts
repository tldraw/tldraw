import { deleteFromSessionStorage, setInSessionStorage } from '@tldraw/utils'
import { describe, expect, it, vi } from 'vitest'
import { createFileLoads, type FileLoad, type FileLoadsDeps, reportFileLoad } from './fileLoad'

function setup(overrides: Partial<FileLoadsDeps> = {}) {
	let t = 0
	let hidden = false
	// Mirrors first_load: the page stops booting when its first board shows.
	let booting = true
	const deps: FileLoadsDeps = {
		now: () => t,
		mark: vi.fn(),
		measure: vi.fn(),
		log: vi.fn(),
		isPageBooting: () => booting,
		isHidden: () => hidden,
		wasHiddenSinceNavigation: () => false,
		firstRouteKind: () => 'root-redirect',
		...overrides,
	}
	return {
		loads: createFileLoads(deps),
		advance: (ms: number) => (t += ms),
		hide: () => (hidden = true),
		show: (load: FileLoad) => {
			load.mark('board-visible')
			booting = false
		},
		deps,
	}
}

const echo = (loadId: string, t_handshake = 300) => ({
	type: 'first_load_server' as const,
	loadId,
	cold: false,
	d_handshake: t_handshake,
	t_handshake,
})

/** What the sync host does per socket: take an id, then receive that socket's echo. */
function connect(load: FileLoad, t_handshake = 300) {
	const id = load.nextConnectId()!
	return { id, echo: () => load.setServerTimings(echo(id, t_handshake)) }
}

describe('file loads', () => {
	it('prints only switches, since first_load already prints the first open', async () => {
		setInSessionStorage('tldraw_debug:logLoads', 'true')
		const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
		vi.spyOn(console, 'table').mockImplementation(() => {})
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
		try {
			const { loads, deps, show } = setup()
			const report = async (load: FileLoad) => {
				connect(load).echo()
				load.mark('sync-connected')
				load.mark('editor-rendered')
				show(load)
				reportFileLoad(load, { email: null, flagEnabled: false, trackEvent: vi.fn(), extra: {} })
				await new Promise((resolve) => setTimeout(resolve, 0))
			}
			await report(loads.begin('abc'))
			expect(deps.log).not.toHaveBeenCalled()
			expect(group).not.toHaveBeenCalled()
			await report(loads.begin('def'))
			expect(deps.log).toHaveBeenCalled()
			expect(group).toHaveBeenCalledTimes(1)
			expect(group.mock.calls[0][0]).toContain('switch')
		} finally {
			deleteFromSessionStorage('tldraw_debug:logLoads')
			vi.restoreAllMocks()
		}
	})

	it('times an open during page boot from navigation start', () => {
		const { loads, advance, show } = setup()
		advance(2000)
		const load = loads.begin('abc')
		load.mark('file-started')
		advance(300)
		// The socket opens before the app gate, so a first open can connect before the editor renders.
		load.mark('sync-connected')
		advance(300)
		load.mark('editor-rendered')
		advance(300)
		show(load)
		expect(load.kind).toBe('first')
		expect(load.buildEvent(false, {})).toMatchObject({
			load_kind: 'first',
			t_file_started: 2000,
			t_editor_rendered: 2600,
			t_board_visible: 2900,
			file_ms: 900,
			total_ms: 2900,
		})
	})

	it('times a switch from the navigation that led to it', () => {
		const { loads, advance, show } = setup()
		show(loads.begin('abc'))
		advance(10_000)
		loads.noteNavigation('/f/def')
		advance(30)
		const load = loads.begin('def')
		load.mark('file-started')
		load.mark('editor-rendered')
		advance(400)
		load.mark('board-visible')
		expect(load.kind).toBe('switch')
		expect(load.buildEvent(false, {})).toMatchObject({
			t_editor_rendered: 30,
			t_board_visible: 430,
			file_ms: 400,
		})
	})

	it('falls back to begin time when no navigation was noted for this file', () => {
		const { loads, advance, show } = setup()
		show(loads.begin('abc'))
		loads.noteNavigation('/f/other')
		advance(1000)
		const load = loads.begin('def')
		advance(50)
		load.mark('editor-rendered')
		expect(load.buildEvent(false, {})).toMatchObject({ t_editor_rendered: 50 })
	})

	it('ignores a same-file navigation so a later remount does not reuse it as t0', () => {
		const { loads, advance, show } = setup()
		const first = loads.begin('abc')
		loads.noteNavigation('/f/abc')
		advance(1000)
		show(first)
		advance(50)
		const remount = loads.begin('abc')
		advance(20)
		remount.mark('editor-rendered')
		expect(remount.buildEvent(false, {})).toMatchObject({ t_editor_rendered: 20 })
	})

	it('reuses the load when the same file begins twice before its board shows', () => {
		const { loads } = setup()
		expect(loads.begin('abc')).toBe(loads.begin('abc'))
	})

	it('reports a same-file remount after board-visible as a remount with fresh marks', () => {
		const { loads, advance, show } = setup()
		const first = loads.begin('abc')
		first.mark('editor-rendered')
		first.mark('sync-connected')
		advance(500)
		show(first)
		advance(100)
		const remount = loads.begin('abc')
		expect(remount).not.toBe(first)
		expect(remount.kind).toBe('remount')
		expect(remount.loadId).not.toBe(first.loadId)
		expect(remount.nextConnectId()).toBeDefined()
		expect(remount.tracker.getMarks()).toEqual({})
	})

	it('does not carry a hidden flag over to a same-file remount', () => {
		const { loads, show } = setup()
		const first = loads.begin('abc')
		loads.onHidden()
		show(first)
		expect(loads.begin('abc').isHidden()).toBe(false)
	})

	it('supersedes an unfinished load when another file opens', () => {
		const { loads } = setup()
		const a = loads.begin('abc')
		loads.begin('def')
		expect(a.isSuperseded()).toBe(true)
	})

	it('marks only the load that was open when the tab hid', () => {
		const { loads } = setup()
		const a = loads.begin('abc')
		loads.onHidden()
		const b = loads.begin('def')
		expect(a.isHidden()).toBe(true)
		expect(b.isHidden()).toBe(false)
	})

	it('starts hidden when the tab is already hidden', () => {
		const { loads, hide } = setup()
		hide()
		expect(loads.begin('abc').isHidden()).toBe(true)
	})

	it('starts a first load hidden if the tab was hidden earlier during page boot', () => {
		const { loads } = setup({ wasHiddenSinceNavigation: () => true })
		expect(loads.begin('abc').isHidden()).toBe(true)
	})

	it('ignores wasHiddenSinceNavigation for a switch', () => {
		const { loads, show } = setup({ wasHiddenSinceNavigation: () => true })
		show(loads.begin('abc'))
		expect(loads.begin('def').isHidden()).toBe(false)
	})

	it('builds its event once', () => {
		const { loads, show } = setup()
		const load = loads.begin('abc')
		show(load)
		expect(load.buildEvent(false, { file_size_bucket: '0-1 MB' })).toMatchObject({
			file_size_bucket: '0-1 MB',
		})
		expect(load.buildEvent(false, {})).toBeNull()
	})
})

describe('connect ids and echoes', () => {
	it('gives each connect attempt its own id, and none after sync-connected', () => {
		const { loads } = setup()
		const load = loads.begin('abc')
		const a = load.nextConnectId()
		const b = load.nextConnectId()
		expect(a).toMatch(/^[A-Za-z0-9_-]{8,32}$/)
		expect(b).not.toBe(a)
		load.mark('sync-connected')
		expect(load.nextConnectId()).toBeUndefined()
	})

	it('takes the echo of the socket that got synced, even when it landed first', () => {
		const { loads } = setup()
		const load = loads.begin('abc')
		const failed = connect(load, 111)
		const synced = connect(load, 300)
		synced.echo()
		failed.echo()
		load.mark('sync-connected')
		expect(load.connectId()).toBe(synced.id)
		expect(load.buildEvent(true, {})).toMatchObject({
			connect_id: synced.id,
			srv_t_handshake: 300,
		})
	})

	it('takes the synced socket echo when it lands after sync-connected', () => {
		const { loads } = setup()
		const load = loads.begin('abc')
		const failed = connect(load, 111)
		const synced = connect(load, 300)
		load.mark('sync-connected')
		failed.echo()
		synced.echo()
		connect(load, 999) // no id after sync-connected
		expect(load.buildEvent(true, {})).toMatchObject({ srv_t_handshake: 300 })
	})

	it('gives every file open its own connect ids', () => {
		const { loads } = setup()
		const a = connect(loads.begin('abc'))
		const b = connect(loads.begin('def'))
		expect(b.id).not.toBe(a.id)
	})

	it("keeps an abandoned open's late echo out of the next open", () => {
		const { loads } = setup()
		const cached = loads.begin('abc')
		const stale = connect(cached, 111)
		const landed = loads.begin('def')
		const own = connect(landed, 300)
		landed.setServerTimings(echo(stale.id, 111))
		own.echo()
		landed.mark('sync-connected')
		expect(landed.buildEvent(true, {})).toMatchObject({ srv_t_handshake: 300 })
	})
})

describe('page boot', () => {
	it('keeps first for the file a cached-file redirect lands on', () => {
		const { loads, advance } = setup()
		advance(1000)
		const cached = loads.begin('abc')
		loads.noteCachedVisit('redirect')
		loads.noteNavigation('/f/def')
		advance(500)
		const landed = loads.begin('def')
		landed.mark('file-started')
		expect(cached.isSuperseded()).toBe(true)
		expect(landed.kind).toBe('first')
		expect(landed.buildEvent(false, {})).toMatchObject({
			load_kind: 'first',
			t_file_started: 1500,
			abandoned_opens: 1,
			cached_visit: 'redirect',
		})
	})

	it('keeps first for the file a cached-file fallback lands on', () => {
		const { loads } = setup()
		loads.begin('abc')
		loads.noteCachedVisit('fallback')
		loads.noteNavigation('/')
		loads.noteNavigation('/f/def')
		const landed = loads.begin('def')
		expect(landed.kind).toBe('first')
		expect(landed.bootFields()).toEqual({
			route_kind: 'root-redirect',
			abandoned_opens: 1,
			cached_visit: 'fallback',
		})
	})

	it('counts a manual leave during boot as an abandoned open, without a cached visit', () => {
		const { loads } = setup()
		loads.begin('abc')
		loads.noteNavigation('/f/abc/history')
		loads.noteNavigation('/f/abc')
		const back = loads.begin('abc')
		expect(back.kind).toBe('first')
		expect(back.bootFields()).toMatchObject({ abandoned_opens: 1, cached_visit: 'none' })
	})

	it('does not count reusing an unfinished same-file open as abandoned', () => {
		const { loads } = setup()
		loads.begin('abc')
		loads.begin('abc')
		expect(loads.begin('abc').bootFields()).toMatchObject({ abandoned_opens: 0 })
	})

	it('keeps the first cached visit outcome', () => {
		const { loads } = setup()
		loads.noteCachedVisit('redirect')
		loads.noteCachedVisit('accepted')
		expect(loads.begin('abc').bootFields()).toMatchObject({ cached_visit: 'redirect' })
	})

	it('starts fresh as a switch when the user leaves after boot and comes back', () => {
		const { loads, advance, show } = setup()
		show(loads.begin('first'))
		const abandoned = loads.begin('abc')
		abandoned.mark('sync-connected')
		loads.noteNavigation('/f/abc/history')
		advance(5000)
		loads.noteNavigation('/f/abc')
		advance(20)
		const back = loads.begin('abc')
		back.mark('file-started')
		expect(abandoned.isSuperseded()).toBe(true)
		expect(back.loadId).not.toBe(abandoned.loadId)
		expect(back.nextConnectId()).toBeDefined()
		expect(back.buildEvent(false, {})).toMatchObject({ load_kind: 'switch', t_file_started: 20 })
	})

	it('tags only first opens with boot fields', () => {
		const { loads, show } = setup()
		const first = loads.begin('abc')
		show(first)
		expect(first.buildEvent(false, {})).toMatchObject({ route_kind: 'root-redirect' })
		const next = loads.begin('def')
		next.mark('board-visible')
		const event = next.buildEvent(false, {})
		expect(event).not.toHaveProperty('route_kind')
		expect(event).not.toHaveProperty('abandoned_opens')
	})
})
