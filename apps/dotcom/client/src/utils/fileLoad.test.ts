import { deleteFromSessionStorage, setInSessionStorage } from '@tldraw/utils'
import { describe, expect, it, vi } from 'vitest'
import { createFileLoads, reportFileLoad, type FileLoadsDeps } from './fileLoad'

const FIRST_ID = 'FirstLoadId_0123456789'

function setup(overrides: Partial<FileLoadsDeps> = {}) {
	let t = 0
	let hidden = false
	const deps: FileLoadsDeps = {
		now: () => t,
		mark: vi.fn(),
		measure: vi.fn(),
		log: vi.fn(),
		firstLoadId: FIRST_ID,
		isHidden: () => hidden,
		wasHiddenSinceNavigation: () => false,
		firstRouteKind: () => 'root-redirect',
		...overrides,
	}
	return {
		loads: createFileLoads(deps),
		advance: (ms: number) => (t += ms),
		hide: () => (hidden = true),
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

describe('file loads', () => {
	it('prints only switches, since first_load already prints the first open', async () => {
		setInSessionStorage('tldraw_debug:logLoads', 'true')
		const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
		vi.spyOn(console, 'table').mockImplementation(() => {})
		vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
		try {
			const { loads, deps } = setup()
			const report = async (load: ReturnType<typeof loads.begin>) => {
				load.mark('editor-rendered')
				load.mark('board-visible')
				load.setServerTimings(echo(load.loadId))
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

	it('treats the first open as the first load: same id, navigation-start clock', () => {
		const { loads, advance } = setup()
		advance(2000)
		const load = loads.begin('abc')
		load.mark('editor-rendered')
		advance(500)
		load.mark('board-visible')
		expect(load).toMatchObject({ kind: 'first', loadId: FIRST_ID })
		expect(load.buildEvent(false, {})).toMatchObject({
			load_kind: 'first',
			t_editor_rendered: 2000,
			t_board_visible: 2500,
			file_ms: 500,
			total_ms: 2500,
		})
	})

	it('times a switch from the navigation that led to it, with a new id', () => {
		const { loads, advance } = setup()
		loads.begin('abc')
		advance(10_000)
		loads.noteNavigation('/f/def')
		advance(30)
		const load = loads.begin('def')
		load.mark('editor-rendered')
		advance(400)
		load.mark('board-visible')
		expect(load.kind).toBe('switch')
		expect(load.loadId).not.toBe(FIRST_ID)
		expect(load.loadId).toMatch(/^[A-Za-z0-9_-]{8,32}$/)
		expect(load.buildEvent(false, {})).toMatchObject({
			t_editor_rendered: 30,
			t_board_visible: 430,
			file_ms: 400,
		})
	})

	it('falls back to begin time when no navigation was noted for this file', () => {
		const { loads, advance } = setup()
		loads.begin('abc')
		loads.noteNavigation('/f/other')
		advance(1000)
		const load = loads.begin('def')
		advance(50)
		load.mark('editor-rendered')
		expect(load.buildEvent(false, {})).toMatchObject({ t_editor_rendered: 50 })
	})

	it('ignores a same-file navigation so a later remount does not reuse it as t0', () => {
		const { loads, advance } = setup()
		const first = loads.begin('abc')
		loads.noteNavigation('/f/abc')
		advance(1000)
		first.mark('board-visible') // so the next begin('abc') is treated as a remount
		advance(50)
		const remount = loads.begin('abc')
		advance(20)
		remount.mark('editor-rendered')
		expect(remount.buildEvent(false, {})).toMatchObject({ t_editor_rendered: 20 })
	})

	it('returns the same load when the same file begins twice (StrictMode double render)', () => {
		const { loads } = setup()
		expect(loads.begin('abc')).toBe(loads.begin('abc'))
	})

	it('starts a new load when the same file remounts after board-visible, even if never reported', () => {
		const { loads, advance } = setup()
		const first = loads.begin('abc')
		first.mark('editor-rendered')
		first.mark('sync-connected')
		advance(500)
		first.mark('board-visible')
		advance(100)
		const remount = loads.begin('abc')
		expect(remount).not.toBe(first)
		expect(remount.loadId).not.toBe(first.loadId)
		expect(remount.connectLoadId()).toBe(remount.loadId)
		expect(remount.tracker.getMarks()).toEqual({})
	})

	it('does not carry a hidden flag over to a same-file remount', () => {
		const { loads } = setup()
		const first = loads.begin('abc')
		loads.onHidden()
		first.mark('board-visible')
		expect(loads.begin('abc').isHidden()).toBe(false)
	})

	it('supersedes an unfinished load when another file opens', () => {
		const { loads } = setup()
		const a = loads.begin('abc')
		loads.begin('def')
		expect(a.isSuperseded()).toBe(true)
	})

	it('sends the load id on the first connect only', () => {
		const { loads } = setup()
		const load = loads.begin('abc')
		expect(load.connectLoadId()).toBe(FIRST_ID)
		load.mark('sync-connected')
		expect(load.connectLoadId()).toBeUndefined()
	})

	it('takes only its own echo, and only the first one', () => {
		const { loads } = setup()
		loads.begin('abc')
		const b = loads.begin('def')
		b.setServerTimings(echo(FIRST_ID, 111))
		b.setServerTimings(echo(b.loadId, 300))
		b.setServerTimings(echo(b.loadId, 999))
		// buildEvent is one-shot, so assert everything on the single event
		expect(b.buildEvent(true, {})).toMatchObject({ srv_t_handshake: 300, srv_echo: true })
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
		const { loads } = setup({ wasHiddenSinceNavigation: () => true })
		loads.begin('abc')
		expect(loads.begin('def').isHidden()).toBe(false)
	})

	it("tags only the first open's event with the first load's route kind", () => {
		const { loads } = setup()
		const first = loads.begin('abc')
		first.mark('board-visible')
		expect(first.buildEvent(false, {})).toMatchObject({ route_kind: 'root-redirect' })
		const next = loads.begin('def')
		next.mark('board-visible')
		expect(next.buildEvent(false, {})).not.toHaveProperty('route_kind')
	})

	it('builds its event once', () => {
		const { loads } = setup()
		const load = loads.begin('abc')
		load.mark('board-visible')
		expect(load.buildEvent(false, { file_size_bucket: '0-1 MB' })).toMatchObject({
			file_size_bucket: '0-1 MB',
		})
		expect(load.buildEvent(false, {})).toBeNull()
	})
})
