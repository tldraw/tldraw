import { describe, expect, it, vi } from 'vitest'
import { createFileLoads, type FileLoadsDeps } from './fileLoad'

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

	it('returns the same load when the same file begins twice (StrictMode double render)', () => {
		const { loads } = setup()
		expect(loads.begin('abc')).toBe(loads.begin('abc'))
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
