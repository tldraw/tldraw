import {
	createShapeId,
	type Editor,
	type TLEventInfo,
	type TLGeoShape,
	type TLShapeId,
} from '@tldraw/editor'
import { GeoShapeGeoStyle } from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getShapePlaintext } from '../editor/richText'
import { codeForKey, type KeyEvent, type MouseEvent } from '../terminal/InputParser'
import { createTestContext, type TestContext } from '../test/testContext'
import { InputController } from './InputController'

function key(k: string, opts: Partial<Omit<KeyEvent, 'type' | 'key'>> = {}): KeyEvent {
	return {
		type: 'key',
		key: k,
		code: codeForKey(k),
		shift: false,
		ctrl: false,
		alt: false,
		meta: false,
		...opts,
	}
}

function mouse(
	action: MouseEvent['action'],
	button: MouseEvent['button'],
	col: number,
	row: number,
	extra: Partial<MouseEvent> = {}
): MouseEvent {
	return {
		type: 'mouse',
		action,
		button,
		col,
		row,
		dx: 0,
		dy: 0,
		shift: false,
		ctrl: false,
		alt: false,
		...extra,
	}
}

// pointer_move and wheel wait for the next tick (Editor._flushEventsForTick).
function tick(editor: Editor, count = 1) {
	for (let i = 0; i < count; i++) editor.emit('tick', 16)
}

interface Recorded {
	kind: 'event' | 'popup'
	name: string
	detail: string
}

describe('InputController', () => {
	let ctx: TestContext
	let editor: Editor
	let input: InputController
	let log: Recorded[]

	function events() {
		return log.filter((e) => e.kind === 'event')
	}

	function dragRect(col0: number, row0: number, col1: number, row1: number) {
		input.handleEvent(mouse('down', 0, col0, row0))
		tick(editor)
		input.handleEvent(
			mouse('drag', 0, Math.floor((col0 + col1) / 2), Math.floor((row0 + row1) / 2))
		)
		tick(editor)
		input.handleEvent(mouse('drag', 0, col1, row1))
		tick(editor)
		input.handleEvent(mouse('up', 0, col1, row1))
		tick(editor)
	}

	function createGeo(x: number, y: number, w = 200, h = 100): TLShapeId {
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x, y, props: { w, h } })
		return id
	}

	beforeEach(() => {
		ctx = createTestContext()
		editor = ctx.editor
		input = new InputController(ctx)
		log = []
		editor.on('event', (info: TLEventInfo) => {
			if (info.type === 'pointer' || info.type === 'keyboard' || info.type === 'wheel') {
				const detail =
					info.type === 'pointer'
						? `b${info.button}`
						: info.type === 'keyboard'
							? info.code
							: `${info.delta.x},${info.delta.y},${info.delta.z}`
				log.push({ kind: 'event', name: info.name, detail })
			}
		})
		const record = ctx.popups.openContextMenu.bind(ctx.popups)
		ctx.popups.openContextMenu = (col, row) => {
			log.push({ kind: 'popup', name: 'openContextMenu', detail: `${col},${row}` })
			record(col, row)
		}
	})

	afterEach(() => {
		input.dispose()
		ctx.dispose()
	})

	describe('mouse', () => {
		it('draws a rectangle from SGR-style down, drag and up events', () => {
			input.handleEvent(key('r'))
			expect(editor.getCurrentToolId()).toBe('geo')
			dragRect(10, 5, 30, 15)
			const shapes = editor.getCurrentPageShapes()
			expect(shapes).toHaveLength(1)
			expect(shapes[0].type).toBe('geo')
			const bounds = editor.getShapePageBounds(shapes[0])!
			// Cell (10,5) is screen (84, 72): canvas starts at row 1, pointer at the cell centre.
			expect(bounds.x).toBeCloseTo(84, 5)
			expect(bounds.y).toBeCloseTo(72, 5)
			expect(bounds.w).toBeCloseTo(160, 5)
			expect(bounds.h).toBeCloseTo(160, 5)
			expect(editor.getCurrentToolId()).toBe('select')
		})

		it('tracks hover and the pointer cell', () => {
			input.handleEvent(mouse('move', -1, 10, 5))
			tick(editor)
			expect(editor.getInstanceState().isHoveringCanvas).toBe(true)
			expect(ctx.ui.pointerCell.get()).toEqual({ col: 10, row: 5 })
			input.handleEvent(mouse('move', -1, 3, 0))
			tick(editor)
			expect(editor.getInstanceState().isHoveringCanvas).toBe(false)
			input.handleEvent(mouse('move', -1, 3, 29))
			expect(editor.getInstanceState().isHoveringCanvas).toBe(false)
		})

		it('drops a move identical to the previous one', () => {
			input.handleEvent(mouse('move', -1, 10, 5))
			input.handleEvent(mouse('move', -1, 10, 5))
			tick(editor)
			input.handleEvent(mouse('move', -1, 10, 5))
			tick(editor)
			expect(events().filter((e) => e.name === 'pointer_move')).toHaveLength(1)
			input.handleEvent(mouse('move', -1, 10, 5, { shift: true }))
			tick(editor)
			expect(events().filter((e) => e.name === 'pointer_move')).toHaveLength(2)
		})

		it('runs the action or onPress of a hot region and shows its hint', () => {
			const pressed: MouseEvent[] = []
			ctx.hotRegions = [
				{
					id: 'tool.hand',
					rect: { x: 0, y: 0, w: 10, h: 1 },
					action: { id: 'tool.hand' },
					hint: 'Hand',
				},
				{
					id: 'custom',
					rect: { x: 10, y: 0, w: 5, h: 1 },
					onPress(event) {
						pressed.push(event)
					},
				},
			]
			input.handleEvent(mouse('move', -1, 2, 0))
			expect(ctx.ui.hint.get()).toBe('Hand')
			input.handleEvent(mouse('down', 0, 2, 0))
			input.handleEvent(mouse('up', 0, 2, 0))
			expect(editor.getCurrentToolId()).toBe('hand')
			expect(events().filter((e) => e.name.startsWith('pointer'))).toHaveLength(0)
			input.handleEvent(mouse('down', 0, 12, 0))
			expect(pressed).toHaveLength(1)
			input.handleEvent(mouse('move', -1, 20, 10))
			expect(ctx.ui.hint.get()).toBeNull()
		})

		it('dispatches a right click and then opens the context menu at the cell', () => {
			createGeo(80, 80)
			input.handleEvent(mouse('down', 2, 20, 8))
			input.handleEvent(mouse('up', 2, 20, 8))
			tick(editor)
			// The editor rewrites a static right release into right_click (Editor.ts:11569) and
			// selects the shape under the pointer; the menu opens after that.
			const names = log.map((e) => `${e.name}:${e.detail}`)
			expect(names.at(-1)).toBe('openContextMenu:20,8')
			expect(names.slice(0, -1)).toContain('right_click:b2')
			expect(editor.getSelectedShapeIds()).toHaveLength(1)
		})

		it('does not open the context menu after a right drag (pan)', () => {
			input.handleEvent(mouse('down', 2, 20, 8))
			input.handleEvent(mouse('drag', 2, 25, 10))
			tick(editor)
			input.handleEvent(mouse('up', 2, 25, 10))
			tick(editor)
			expect(log.some((e) => e.kind === 'popup')).toBe(false)
		})

		it('implies a release when a move or a second down arrives while a button is held', () => {
			input.handleEvent(mouse('down', 0, 10, 5))
			input.handleEvent(mouse('move', -1, 12, 6))
			tick(editor)
			expect(events().map((e) => e.name)).toEqual(['pointer_down', 'pointer_up', 'pointer_move'])
			input.handleEvent(mouse('down', 0, 12, 6))
			input.handleEvent(mouse('down', 0, 14, 7))
			expect(
				events()
					.slice(3)
					.map((e) => e.name)
			).toEqual(['pointer_down', 'pointer_up', 'pointer_down'])
		})

		it('coalesces wheel ticks per frame into one pan', () => {
			for (let i = 0; i < 3; i++) input.handleEvent(mouse('wheel', -1, 20, 10, { dy: 1 }))
			expect(events()).toHaveLength(0)
			input.flushFrame()
			tick(editor, 2)
			const wheels = events().filter((e) => e.name === 'wheel')
			expect(wheels).toHaveLength(1)
			expect(wheels[0].detail).toBe('0,-96,0')
			expect(editor.getCamera().y).toBeCloseTo(-96, 5)
			expect(editor.getCamera().x).toBe(0)

			for (let i = 0; i < 12; i++) input.handleEvent(mouse('wheel', -1, 20, 10, { dy: -1 }))
			input.flushFrame()
			tick(editor, 2)
			expect(editor.getCamera().y).toBeCloseTo(-96 + 5 * 32, 5)
		})

		it('scrolls horizontally with shift or dx', () => {
			input.handleEvent(mouse('wheel', -1, 20, 10, { dy: 1, shift: true }))
			input.handleEvent(mouse('wheel', -1, 20, 10, { dx: 1 }))
			input.flushFrame()
			tick(editor, 2)
			expect(editor.getCamera().x).toBeCloseTo(-64, 5)
			expect(editor.getCamera().y).toBe(0)
		})

		it('zooms with ctrl+wheel through delta.z and with alt+wheel at the pointer', () => {
			input.handleEvent(mouse('wheel', -1, 20, 10, { dy: -1, ctrl: true }))
			input.flushFrame()
			tick(editor, 2)
			expect(editor.getZoomLevel()).toBeGreaterThan(1)
			const afterCtrl = editor.getZoomLevel()

			input.handleEvent(mouse('wheel', -1, 20, 10, { dy: -1, alt: true }))
			input.flushFrame()
			tick(editor, 2)
			expect(editor.getZoomLevel()).toBe(2)
			expect(editor.getZoomLevel()).toBeGreaterThan(afterCtrl)
			// alt+wheel never reaches the editor as a wheel event.
			expect(events().filter((e) => e.name === 'wheel')).toHaveLength(1)

			input.handleEvent(mouse('wheel', -1, 20, 10, { dy: 1, alt: true }))
			input.flushFrame()
			expect(editor.getZoomLevel()).toBe(1)
		})

		it('snaps a click on a handle cell onto the handle so a drag resizes', () => {
			const id = createGeo(80, 80)
			editor.select(id)
			const corner = editor.overlays
				.getActiveOverlayEntries()
				.flatMap((e) => e.overlays)
				.find((o) => (o.props as { handle?: string }).handle === 'bottom_right')!
			const centre = editor.pageToScreen(editor.overlays.getOverlayGeometry(corner)!.bounds.center)
			const col = Math.floor(centre.x / 8)
			const row = 1 + Math.floor(centre.y / 16)
			input.handleEvent(mouse('down', 0, col, row))
			expect(editor.isIn('select.pointing_resize_handle')).toBe(true)
			input.handleEvent(mouse('drag', 0, col + 5, row + 3))
			tick(editor)
			input.handleEvent(mouse('drag', 0, col + 10, row + 5))
			tick(editor)
			expect(editor.isIn('select.resizing')).toBe(true)
			input.handleEvent(mouse('up', 0, col + 10, row + 5))
			tick(editor)
			const bounds = editor.getShapePageBounds(id)!
			expect(bounds.w).toBeGreaterThan(270)
			expect(bounds.h).toBeGreaterThan(170)
			expect(bounds.x).toBe(80)
			expect(bounds.y).toBe(80)
		})

		it('synthesizes a pointer up and clears latches on focus out mid drag', () => {
			input.handleEvent(key('r'))
			input.handleEvent(key('F5'))
			input.handleEvent(mouse('down', 0, 10, 5))
			input.handleEvent(mouse('drag', 0, 20, 10))
			tick(editor)
			expect(editor.inputs.getIsPointing()).toBe(true)
			input.handleEvent({ type: 'focus', focused: false })
			tick(editor)
			expect(events().filter((e) => e.name === 'pointer_up')).toHaveLength(1)
			expect(editor.inputs.getIsPointing()).toBe(false)
			expect(ctx.ui.focused.get()).toBe(false)
			expect(ctx.ui.latches.get().shift).toBe(false)
			expect(editor.getInstanceState().isHoveringCanvas).toBe(false)
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
			input.handleEvent({ type: 'focus', focused: true })
			expect(ctx.renders).toBe(1)
		})

		it('ends a held gesture on resize', () => {
			input.handleEvent(mouse('down', 0, 10, 5))
			input.handleEvent({ type: 'resize', cols: 120, rows: 40 })
			expect(events().map((e) => e.name)).toEqual(['pointer_down', 'pointer_up'])
		})
	})

	describe('modifier latches', () => {
		it('F5 holds shift for one drag and releases it on pointer up', () => {
			input.handleEvent(key('r'))
			input.handleEvent(key('F5'))
			expect(ctx.ui.latches.get().shift).toBe(true)
			input.handleEvent(mouse('down', 0, 10, 5))
			expect(events().map((e) => `${e.name}:${e.detail}`)).toEqual([
				'key_down:ShiftLeft',
				'pointer_down:b0',
			])
			expect(editor.inputs.getShiftKey()).toBe(true)
			input.handleEvent(mouse('drag', 0, 20, 8))
			tick(editor)
			input.handleEvent(mouse('drag', 0, 30, 10))
			tick(editor)
			expect(editor.inputs.getShiftKey()).toBe(true)
			expect(editor.inputs.keys.has('ShiftLeft')).toBe(true)
			input.handleEvent(mouse('up', 0, 30, 10))
			tick(editor)
			expect(ctx.ui.latches.get().shift).toBe(false)
			const tail = events()
				.slice(-2)
				.map((e) => `${e.name}:${e.detail}`)
			expect(tail).toEqual(['pointer_up:b0', 'key_up:ShiftLeft'])
			expect(editor.inputs.keys.has('ShiftLeft')).toBe(false)
			// Shift locks the aspect ratio while creating a geo shape.
			const bounds = editor.getShapePageBounds(editor.getCurrentPageShapes()[0])!
			expect(bounds.w).toBeCloseTo(bounds.h, 5)
		})

		it('a double tap makes the latch sticky and a shift latch nudges by 10', () => {
			input.handleEvent(key('F5'))
			input.handleEvent(key('F5'))
			expect(ctx.ui.latches.get()).toMatchObject({ shift: true, stickyShift: true })
			const id = createGeo(80, 80)
			editor.select(id)
			input.handleEvent(key('ArrowRight'))
			expect(editor.getShape(id)!.x).toBe(90)
			input.handleEvent(mouse('down', 0, 50, 20))
			input.handleEvent(mouse('up', 0, 50, 20))
			expect(ctx.ui.latches.get().shift).toBe(true)
			input.handleEvent(key('F5'))
			expect(ctx.ui.latches.get()).toMatchObject({ shift: false, stickyShift: false })
		})
	})

	describe('keyboard', () => {
		it('selects tools from letters', () => {
			input.handleEvent(key('h'))
			expect(editor.getCurrentToolId()).toBe('hand')
			input.handleEvent(key('d'))
			expect(editor.getCurrentToolId()).toBe('draw')
			input.handleEvent(key('o'))
			expect(editor.getCurrentToolId()).toBe('geo')
			expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('ellipse')
			input.handleEvent(key('r'))
			expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('rectangle')
			input.handleEvent(key('v'))
			expect(editor.getCurrentToolId()).toBe('select')
			expect(ctx.ui.firstKeySeen.get()).toBe(true)
		})

		it('undoes, deletes, selects all and groups', () => {
			input.handleEvent(key('r'))
			dragRect(10, 5, 20, 10)
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
			input.handleEvent(key('z', { ctrl: true }))
			expect(editor.getCurrentPageShapes()).toHaveLength(0)
			input.handleEvent(key('y', { ctrl: true }))
			expect(editor.getCurrentPageShapes()).toHaveLength(1)

			const a = createGeo(300, 80)
			const b = createGeo(600, 80)
			input.handleEvent(key('a', { ctrl: true }))
			expect(editor.getSelectedShapeIds()).toHaveLength(3)
			input.handleEvent(key('g', { ctrl: true }))
			expect(editor.getSelectedShapes()).toHaveLength(1)
			expect(editor.getSelectedShapes()[0].type).toBe('group')
			input.handleEvent(key('g', { ctrl: true }))
			expect(editor.getSelectedShapeIds()).toHaveLength(3)
			expect(editor.getCurrentPageShapes().some((s) => s.type === 'group')).toBe(false)

			editor.select(a, b)
			input.handleEvent(key('Delete'))
			expect(editor.getCurrentPageShapes()).toHaveLength(1)
			editor.selectAll()
			input.handleEvent(key('Backspace'))
			expect(editor.getCurrentPageShapes()).toHaveLength(0)
		})

		it('quits on a second ctrl+c within a second when nothing is selected', () => {
			ctx.time = 1000
			input.handleEvent(key('c', { ctrl: true }))
			expect(ctx.ui.hint.get()).toBe('ctrl+q quits')
			expect(ctx.quits).toBe(0)
			ctx.time = 2500
			input.handleEvent(key('c', { ctrl: true }))
			expect(ctx.quits).toBe(0)
			ctx.time = 3000
			input.handleEvent(key('c', { ctrl: true }))
			expect(ctx.quits).toBe(1)

			const id = createGeo(80, 80)
			editor.select(id)
			input.handleEvent(key('c', { ctrl: true }))
			expect(ctx.clipboard.content).not.toBeNull()
			expect(ctx.quits).toBe(1)
		})

		it('zooms and toggles the grid', () => {
			input.handleEvent(key('='))
			expect(editor.getZoomLevel()).toBe(2)
			input.handleEvent(key('-'))
			expect(editor.getZoomLevel()).toBe(1)
			input.handleEvent(key("'"))
			expect(editor.getInstanceState().isGridMode).toBe(true)
			input.handleEvent(key('"', { shift: true }))
			expect(editor.user.getIsSnapMode()).toBe(true)
			input.handleEvent(key('/', { ctrl: true }))
			expect(ctx.colorModes).toEqual(['dark'])
		})

		it('opens the geo picker on g and cycles the shape on a quick second g', () => {
			ctx.time = 0
			input.handleEvent(key('g'))
			expect(ctx.popups.calls.map((c) => c.method)).toEqual(['openGeoPicker'])
			ctx.time = 400
			input.handleEvent(key('g'))
			expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('ellipse')
			expect(editor.getCurrentToolId()).toBe('geo')
			ctx.time = 700
			input.handleEvent(key('g'))
			expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('triangle')
			// After a pause g opens the picker again.
			ctx.time = 5000
			input.handleEvent(key('g'))
			expect(ctx.popups.calls.filter((c) => c.method === 'openGeoPicker')).toHaveLength(2)
			// With the picker open, g keeps cycling and moves the picker's row.
			ctx.ui.openPopup({ kind: 'geo', index: 3 })
			ctx.time = 9000
			input.handleEvent(key('g'))
			expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('diamond')
			expect(ctx.ui.popup.get()).toEqual({ kind: 'geo', index: 4 })
		})

		it('cancels with Escape and never dispatches it as a key', () => {
			const id = createGeo(80, 80)
			editor.select(id)
			input.handleEvent(key('Escape'))
			expect(editor.getSelectedShapeIds()).toHaveLength(0)
			input.handleEvent(key('d'))
			input.handleEvent(key('Escape'))
			expect(editor.getCurrentToolId()).toBe('select')
			expect(events().some((e) => e.detail === 'Escape')).toBe(false)
			expect(editor.inputs.keys.has('Escape')).toBe(false)
		})

		it('forwards arrows and letters to the editor as one key down and up pair, never Space', () => {
			const id = createGeo(80, 80)
			editor.select(id)
			input.handleEvent(key('ArrowRight'))
			expect(editor.getShape(id)!.x).toBe(81)
			expect(events().map((e) => `${e.name}:${e.detail}`)).toEqual([
				'key_down:ArrowRight',
				'key_up:ArrowRight',
			])
			input.handleEvent(key('ArrowRight', { repeat: true }))
			expect(
				events()
					.slice(2)
					.map((e) => e.name)
			).toEqual(['key_repeat'])
			input.handleEvent(key(' '))
			input.handleEvent(key('j'))
			expect(
				events()
					.slice(3)
					.map((e) => `${e.name}:${e.detail}`)
			).toEqual(['key_down:KeyJ', 'key_up:KeyJ'])
		})

		it('routes everything to an open popup and runs the action it returns', () => {
			ctx.ui.openPopup({ kind: 'help', tab: 0, scroll: 0 })
			ctx.popups.nextResult = { consumed: true, action: { id: 'tool.hand' } }
			input.handleEvent(key('x'))
			expect(ctx.popups.calls.map((c) => c.method)).toEqual(['handleInput'])
			expect(editor.getCurrentToolId()).toBe('hand')
			input.handleEvent(mouse('down', 0, 10, 5))
			expect(events()).toHaveLength(0)
		})
	})

	describe('keyboard pointer mode', () => {
		it('draws a rectangle with arrows, Space and Enter', () => {
			input.handleEvent(key('F8'))
			expect(ctx.ui.pointerMode.get()).toBe(true)
			expect(ctx.ui.pointerCell.get()).toEqual({ col: 50, row: 15 })
			// A shift latch moves five cells; cleared again (double tap + tap) so it does not lock
			// the aspect ratio of the drag below.
			input.handleEvent(key('F5'))
			input.handleEvent(key('ArrowLeft'))
			tick(editor)
			expect(ctx.ui.pointerCell.get()).toEqual({ col: 45, row: 15 })
			input.handleEvent(key('F5'))
			input.handleEvent(key('F5'))
			expect(ctx.ui.latches.get().shift).toBe(false)

			input.handleEvent(key('r'))
			input.handleEvent(key(' '))
			expect(ctx.ui.pointerButtonDown.get()).toBe(true)
			tick(editor)
			for (let i = 0; i < 4; i++) {
				input.handleEvent(key('ArrowRight'))
				tick(editor)
			}
			for (let i = 0; i < 5; i++) {
				input.handleEvent(key('ArrowDown'))
				tick(editor)
			}
			expect(ctx.ui.pointerCell.get()).toEqual({ col: 49, row: 20 })
			input.handleEvent(key(' '))
			tick(editor)
			expect(ctx.ui.pointerButtonDown.get()).toBe(false)
			const shapes = editor.getCurrentPageShapes()
			expect(shapes).toHaveLength(1)
			const bounds = editor.getShapePageBounds(shapes[0])!
			expect(bounds.w).toBeCloseTo(4 * 8, 5)
			expect(bounds.h).toBeCloseTo(5 * 16, 5)

			// Enter clicks: selecting the shape under the virtual pointer.
			editor.selectNone()
			input.handleEvent(key('ArrowLeft'))
			tick(editor)
			input.handleEvent(key('Enter'))
			tick(editor)
			expect(editor.getSelectedShapeIds()).toEqual([shapes[0].id])
		})

		it('Tab jumps between shape centres', () => {
			const a = createGeo(80, 80)
			const b = createGeo(400, 160)
			input.handleEvent(key('F8'))
			input.handleEvent(key('Tab'))
			tick(editor)
			const centreA = editor.pageToScreen(editor.getShapePageBounds(a)!.center)
			expect(ctx.ui.pointerCell.get()).toEqual({
				col: Math.floor(centreA.x / 8),
				row: 1 + Math.floor(centreA.y / 16),
			})
			input.handleEvent(key('Tab'))
			tick(editor)
			const centreB = editor.pageToScreen(editor.getShapePageBounds(b)!.center)
			expect(ctx.ui.pointerCell.get()).toEqual({
				col: Math.floor(centreB.x / 8),
				row: 1 + Math.floor(centreB.y / 16),
			})
			input.handleEvent(key('Tab'))
			expect(ctx.ui.pointerCell.get()!.col).toBe(Math.floor(centreA.x / 8))
		})

		it('releases a held virtual button when the mode is switched off', () => {
			input.handleEvent(key('F8'))
			input.handleEvent(key(' '))
			expect(editor.inputs.getIsPointing()).toBe(true)
			input.handleEvent(key('F8'))
			input.flushFrame()
			expect(editor.inputs.getIsPointing()).toBe(false)
			expect(ctx.ui.pointerButtonDown.get()).toBe(false)
		})
	})

	describe('text editing', () => {
		it('starts a session when Enter starts editing, edits rich text and completes on Escape', () => {
			const id = createGeo(80, 80)
			editor.select(id)
			input.handleEvent(key('Enter'))
			expect(editor.getEditingShapeId()).toBe(id)
			const session = input.getEditSession()
			expect(session?.shapeId).toBe(id)
			input.handleEvent(key('h'))
			input.handleEvent(key('i'))
			expect(getShapePlaintext(editor, editor.getShape(id)!)).toBe('hi')
			input.handleEvent(key('ArrowLeft'))
			expect(session!.getCaret()).toBe(1)
			input.handleEvent(key('x'))
			expect(getShapePlaintext(editor, editor.getShape(id)!)).toBe('hxi')
			expect(ctx.ui.editCaret.get()).toEqual({ shapeId: id, caret: 2 })
			// Shortcut letters are text while editing.
			expect(editor.getCurrentToolId()).toBe('select')
			input.handleEvent(key('Escape'))
			expect(editor.getEditingShapeId()).toBeNull()
			expect(input.getEditSession()).toBeNull()
			expect(ctx.ui.editCaret.get()).toBeNull()
			expect(getShapePlaintext(editor, editor.getShape(id)!)).toBe('hxi')
			expect(editor.getSelectedShapeIds()).toEqual([id])
		})

		it('follows editing started elsewhere and pastes into the session', () => {
			const id = createGeo(80, 80)
			editor.select(id)
			editor.setEditingShape(id)
			expect(input.getEditSession()?.shapeId).toBe(id)
			input.handleEvent({ type: 'paste', text: 'a\nb' })
			expect(getShapePlaintext(editor, editor.getShape(id)!)).toBe('a\nb')
			editor.setEditingShape(null)
			expect(input.getEditSession()).toBeNull()
		})

		it('pastes text onto the canvas when not editing', async () => {
			input.handleEvent(mouse('move', -1, 30, 10))
			tick(editor)
			input.handleEvent({ type: 'paste', text: 'hello' })
			await vi.waitFor(() => {
				const texts = editor.getCurrentPageShapes().filter((s) => s.type === 'text')
				expect(texts).toHaveLength(1)
				expect(getShapePlaintext(editor, texts[0])).toBe('hello')
			})
		})
	})
})
