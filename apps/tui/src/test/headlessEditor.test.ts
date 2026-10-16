import {
	Editor,
	Group2d,
	TLArrowShape,
	TLGeoShape,
	TLKeyboardEventInfo,
	TLOverlay,
	TLPointerEventInfo,
	TLTextShape,
	createShapeId,
	getArrowInfo,
	parseTldrawJsonFile,
	renderPlaintextFromRichText,
	serializeTldrawJson,
	toRichText,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Path2DPolyfill } from '../bootstrap/path2d'
import { CELL_H, CELL_W } from '../editor/constants'
import { TUI_OVERLAY_UTILS, TuiEditor, createTuiEditor } from '../editor/createTuiEditor'

// Built like packages/driver/src/lib/Driver.ts getPointerEventInfo: a canvas-target mouse event.
function ptr(
	name: TLPointerEventInfo['name'],
	x: number,
	y: number,
	extra: Partial<TLPointerEventInfo> = {}
): TLPointerEventInfo {
	return {
		type: 'pointer',
		name,
		point: { x, y, z: null },
		pointerId: 1,
		button: 0,
		isPen: false,
		isPenDirect: false,
		target: 'canvas',
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		...extra,
	} as TLPointerEventInfo
}

function kbd(name: TLKeyboardEventInfo['name'], key: string, code = key): TLKeyboardEventInfo {
	return {
		type: 'keyboard',
		name,
		key,
		code,
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
	}
}

function wheel(
	editor: Editor,
	x: number,
	y: number,
	delta: { x: number; y: number; z: number },
	ctrl = false
) {
	editor.dispatch({
		type: 'wheel',
		name: 'wheel',
		point: { x, y },
		delta,
		shiftKey: false,
		altKey: false,
		ctrlKey: ctrl,
		metaKey: false,
		accelKey: ctrl,
	})
	tick(editor, 2)
}

// pointer_move and wheel wait for the next tick (Editor._flushEventsForTick), so every move is
// followed by one.
function tick(editor: Editor, count = 1) {
	for (let i = 0; i < count; i++) editor.emit('tick', 16)
}

function drag(editor: Editor, x0: number, y0: number, x1: number, y1: number) {
	editor.dispatch(ptr('pointer_move', x0, y0))
	tick(editor)
	editor.dispatch(ptr('pointer_down', x0, y0))
	tick(editor)
	// An intermediate move makes isDragging true before the final position lands.
	editor.dispatch(ptr('pointer_move', (x0 + x1) / 2, (y0 + y1) / 2))
	tick(editor)
	editor.dispatch(ptr('pointer_move', x1, y1))
	tick(editor)
	editor.dispatch(ptr('pointer_up', x1, y1))
	tick(editor)
}

function drawRect(editor: Editor, x0: number, y0: number, x1: number, y1: number): TLGeoShape {
	const before = new Set(editor.getCurrentPageShapeIds())
	editor.setCurrentTool('geo')
	drag(editor, x0, y0, x1, y1)
	const created = editor.getCurrentPageShapes().filter((s) => !before.has(s.id))
	expect(created).toHaveLength(1)
	expect(created[0].type).toBe('geo')
	return created[0] as TLGeoShape
}

function overlayType(entry: { util: object }): string {
	return (entry.util.constructor as { type?: string }).type ?? ''
}

interface RecordingCtx {
	ctx: CanvasRenderingContext2D
	calls: Map<string, unknown[][]>
}

// A CanvasRenderingContext2D stand-in that records every call, like the spike's recording proxy.
function createRecordingCtx(): RecordingCtx {
	const state: Record<string, unknown> = {
		fillStyle: '#000',
		strokeStyle: '#000',
		lineWidth: 1,
		globalAlpha: 1,
		lineCap: 'butt',
		lineJoin: 'miter',
		lineDashOffset: 0,
		font: '10px sans-serif',
		textAlign: 'start',
		textBaseline: 'alphabetic',
		canvas: { width: 800, height: 480 },
	}
	const calls = new Map<string, unknown[][]>()
	const ctx = new Proxy(state, {
		get(target, prop) {
			if (typeof prop !== 'string') return undefined
			if (prop in target) return target[prop]
			return (...args: unknown[]) => {
				const list = calls.get(prop) ?? []
				list.push(args)
				calls.set(prop, list)
				switch (prop) {
					case 'measureText':
						return { width: String(args[0]).length * CELL_W }
					case 'getTransform':
						return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
					case 'getLineDash':
						return []
					case 'isPointInPath':
					case 'isPointInStroke':
						return false
					default:
						return undefined
				}
			}
		},
		set(target, prop, value) {
			if (typeof prop === 'string') target[prop] = value
			return true
		},
	}) as unknown as CanvasRenderingContext2D
	return { ctx, calls }
}

function renderOverlays(editor: Editor): Map<string, RecordingCtx> {
	const rendered = new Map<string, RecordingCtx>()
	const cam = editor.getCamera()
	for (const entry of editor.overlays.getActiveOverlayEntries()) {
		const recording = createRecordingCtx()
		// Page space, like CanvasOverlays.tsx:72-84.
		recording.ctx.setTransform(cam.z, 0, 0, cam.z, cam.z * cam.x, cam.z * cam.y)
		recording.ctx.save()
		entry.util.render(recording.ctx, entry.overlays)
		recording.ctx.restore()
		rendered.set(overlayType(entry), recording)
	}
	return rendered
}

describe('headless editor', () => {
	let tui: TuiEditor
	let editor: Editor

	beforeEach(() => {
		tui = createTuiEditor({ colorMode: 'light', cols: 100, rows: 30 })
		editor = tui.editor
	})

	afterEach(() => {
		tui.dispose()
	})

	it('is built with the terminal options, container and overlay set', () => {
		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: 0,
			y: 0,
			w: 100 * CELL_W,
			h: 30 * CELL_H,
		})
		expect(editor.options.hitTestMargin).toBe(9)
		expect(editor.options.coarseHitTestMargin).toBe(9)
		expect(editor.options.edgeScrollSpeed).toBe(0)
		expect(editor.options.spacebarPanning).toBe(false)
		expect(editor.getCameraOptions().zoomSteps).toEqual([0.1, 0.25, 0.5, 1, 2, 4, 8])
		expect(editor.user.getEdgeScrollSpeed()).toBe(0)
		expect(editor.getColorMode()).toBe('light')
		expect(editor.getIsFocused()).toBe(true)
		expect(editor.getPath()).toBe('select.idle')

		expect(tui.container.tabIndex).toBe(0)
		expect(tui.container.parentElement).toBe(document.body)
		expect(editor.getContainer()).toBe(tui.container)
		expect(tui.tickListenerBaseline).toBeGreaterThanOrEqual(1)
		expect(editor.listenerCount('tick')).toBe(tui.tickListenerBaseline)

		const types = TUI_OVERLAY_UTILS.map((util) => util.type)
		expect(types.some((type) => type.startsWith('collaborator'))).toBe(false)
		for (const type of ['selection_foreground', 'shape_indicator', 'shape_handle', 'brush']) {
			expect(types).toContain(type)
			expect(editor.overlays.getOverlayUtil(type)).toBeDefined()
		}
	})

	it('creates a geo rect from dispatched pointer events', () => {
		const rect = drawRect(editor, 100, 100, 300, 200)
		expect(rect.props.geo).toBe('rectangle')
		expect(editor.getShapePageBounds(rect.id)).toMatchObject({ x: 100, y: 100, w: 200, h: 100 })
		expect(editor.getCurrentToolId()).toBe('select')
		expect(editor.getSelectedShapeIds()).toEqual([rect.id])
	})

	it('renders every active overlay through a canvas context without throwing', () => {
		const rect = drawRect(editor, 100, 100, 300, 200)
		editor.setCurrentTool('select')
		editor.select(rect.id)
		editor.updateInstanceState({ isHoveringCanvas: true })
		editor.dispatch(ptr('pointer_move', 200, 150))
		tick(editor)

		const entries = editor.overlays.getActiveOverlayEntries()
		const types = entries.map(overlayType)
		expect(types).toContain('selection_foreground')
		expect(types).toContain('shape_indicator')
		const selectionIds = entries
			.find((entry) => overlayType(entry) === 'selection_foreground')!
			.overlays.map((o: TLOverlay) => o.id)
		expect(selectionIds).toContain('selection_fg:bottom_right')

		const rendered = renderOverlays(editor)
		// Indicators are batched into one Path2D and stroked; the instanceof test inside
		// strokeShapeIndicators must have passed for the Path2D branch to be taken.
		const indicatorStrokes = rendered.get('shape_indicator')!.calls.get('stroke') ?? []
		expect(indicatorStrokes.length).toBeGreaterThan(0)
		expect(indicatorStrokes.some(([path]) => path instanceof Path2DPolyfill)).toBe(true)
		expect(indicatorStrokes.some(([path]) => path instanceof Path2D)).toBe(true)
		const selectionCalls = rendered.get('selection_foreground')!.calls
		// The selection box (strokeRect) plus the four corner handles (fillRect + strokeRect each);
		// edge handles are hit targets only (SelectionForegroundOverlayUtil._renderResizeCorners).
		expect((selectionCalls.get('fillRect') ?? []).length).toBe(4)
		expect((selectionCalls.get('strokeRect') ?? []).length).toBe(5)

		// The brush overlay appears while dragging on empty canvas and renders too.
		editor.selectNone()
		editor.dispatch(ptr('pointer_move', 500, 300))
		tick(editor)
		editor.dispatch(ptr('pointer_down', 500, 300))
		tick(editor)
		editor.dispatch(ptr('pointer_move', 560, 360))
		tick(editor)
		editor.dispatch(ptr('pointer_move', 600, 400))
		tick(editor)
		expect(editor.getPath()).toBe('select.brushing')
		expect(editor.overlays.getActiveOverlayEntries().map(overlayType)).toContain('brush')
		const brush = renderOverlays(editor).get('brush')!
		expect(
			(brush.calls.get('fillRect') ?? []).length + (brush.calls.get('fill') ?? []).length
		).toBeGreaterThan(0)
		editor.dispatch(ptr('pointer_up', 600, 400))
		tick(editor)
	})

	it('resizes through a canvas pointer_down at the bottom-right handle geometry centre', () => {
		const rect = drawRect(editor, 100, 100, 300, 200)
		editor.setCurrentTool('select')
		editor.select(rect.id)

		const selectionFg = editor.overlays.getOverlayUtil('selection_foreground')
		const handle = selectionFg.getOverlays().find((o) => o.id === 'selection_fg:bottom_right')!
		const geometry = editor.overlays.getOverlayGeometry(handle)!
		const centre = geometry.center
		expect(centre.x).toBeCloseTo(300, 3)
		expect(centre.y).toBeCloseTo(200, 3)
		expect(editor.overlays.getOverlayAtPoint(centre)?.id).toBe('selection_fg:bottom_right')

		const screen = editor.pageToScreen(centre)
		editor.dispatch(ptr('pointer_move', screen.x, screen.y))
		tick(editor)
		expect(editor.getInstanceState().cursor.type).toBe('nwse-resize')
		editor.dispatch(ptr('pointer_down', screen.x, screen.y))
		tick(editor)
		expect(editor.getPath()).toBe('select.pointing_resize_handle')
		editor.dispatch(ptr('pointer_move', screen.x + 40, screen.y + 40))
		tick(editor)
		editor.dispatch(ptr('pointer_move', screen.x + 80, screen.y + 80))
		tick(editor)
		editor.dispatch(ptr('pointer_up', screen.x + 80, screen.y + 80))
		tick(editor)

		expect(editor.getPath()).toBe('select.idle')
		expect(editor.getShape<TLGeoShape>(rect.id)!.props).toMatchObject({ w: 280, h: 180 })
	})

	it('binds an arrow dragged between two rects to both of them', () => {
		const first = drawRect(editor, 100, 100, 300, 200)
		const second = drawRect(editor, 500, 100, 700, 200)
		editor.setCurrentTool('arrow')
		drag(editor, 200, 150, 600, 150)

		const arrows = editor
			.getCurrentPageShapes()
			.filter((s): s is TLArrowShape => s.type === 'arrow')
		expect(arrows).toHaveLength(1)
		const bindings = editor.getBindingsFromShape(arrows[0].id, 'arrow')
		expect(bindings.map((b) => [b.props.terminal, b.toId]).sort()).toEqual([
			['end', second.id],
			['start', first.id],
		])
		const info = getArrowInfo(editor, arrows[0])
		expect(info?.isValid).toBe(true)
		expect(info?.type).toBe('straight')
	})

	it('starts editing on Enter, measures text through the monospace measurer and leaves editing', () => {
		const id = createShapeId('t1')
		editor.setCurrentTool('select')
		editor.createShape({ id, type: 'text', x: 50, y: 300, props: { richText: toRichText('hi') } })
		// Geometry comes from TextShapeUtil.getTextSize: the measured width plus 1 px, and the height
		// floored at the font size (24 px for size m, more than one 16 px row). props.w is only
		// rewritten by onBeforeUpdate (there is no onBeforeCreate).
		expect(editor.getShapeGeometry(id).bounds).toMatchObject({ w: 2 * CELL_W + 1, h: 24 })
		expect(editor.getShape<TLTextShape>(id)!.props.w).toBe(8)

		editor.select(id)
		editor.dispatch(kbd('key_down', 'Enter'))
		tick(editor)
		editor.dispatch(kbd('key_up', 'Enter'))
		tick(editor)
		expect(editor.getEditingShapeId()).toBe(id)
		expect(editor.getPath()).toBe('select.editing_shape')

		editor.updateShape<TLTextShape>({
			id,
			type: 'text',
			props: { richText: toRichText('hello world\nline two') },
		})
		const edited = editor.getShape<TLTextShape>(id)!
		expect(renderPlaintextFromRichText(editor, edited.props.richText)).toBe('hello world\nline two')
		expect(edited.props.w).toBe(11 * CELL_W + 1)
		expect(editor.getShapeGeometry(id).bounds.h).toBe(2 * CELL_H)

		editor.complete()
		tick(editor)
		expect(editor.getEditingShapeId()).toBeNull()
		expect(editor.getPath()).toBe('select.idle')

		editor.select(id)
		expect(editor.getSelectedShapeIds()).toEqual([id])
		editor.cancel()
		tick(editor)
		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getPath()).toBe('select.idle')
	})

	it('lays geo labels out with the monospace measurer', () => {
		const rect = drawRect(editor, 100, 100, 300, 200)
		editor.updateShape<TLGeoShape>({
			id: rect.id,
			type: 'geo',
			props: { richText: toRichText('Box label') },
		})
		const geometry = editor.getShapeGeometry(rect.id)
		expect(geometry).toBeInstanceOf(Group2d)
		const label = (geometry as Group2d).children.find((child) => child.isLabel)!
		expect(label).toBeDefined()
		// 9 cells plus LABEL_PADDING (16) on each side.
		expect(label.bounds.w).toBe(9 * CELL_W + 32)
	})

	it('pans with the wheel and zooms with ctrl+wheel when delta.z is supplied', () => {
		const before = { ...editor.getCamera() }
		wheel(editor, 400, 200, { x: 0, y: -48, z: 0 })
		const panned = editor.getCamera()
		expect(panned.x).toBeCloseTo(before.x, 6)
		expect(panned.y).toBeCloseTo(before.y - 48, 6)
		expect(panned.z).toBe(1)

		// Without delta.z a ctrl+wheel does nothing (Editor.ts wheel branch reads dz for zoom).
		wheel(editor, 400, 200, { x: 0, y: -48, z: 0 }, true)
		expect(editor.getCamera().z).toBe(1)

		wheel(editor, 400, 200, { x: 0, y: -48, z: -0.1 }, true)
		expect(editor.getCamera().z).toBeCloseTo(0.9, 6)
		wheel(editor, 400, 200, { x: 0, y: 48, z: 0.1 }, true)
		expect(editor.getCamera().z).toBeCloseTo(0.99, 6)
	})

	it('undoes and redoes a drawn rect', () => {
		const rect = drawRect(editor, 100, 100, 300, 200)
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
		editor.undo()
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
		editor.redo()
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
		expect(editor.getShape(rect.id)).toBeDefined()
	})

	it('round-trips the document through serializeTldrawJson, parseTldrawJsonFile and loadSnapshot', async () => {
		const rect = drawRect(editor, 100, 100, 300, 200)
		editor.updateShape<TLGeoShape>({
			id: rect.id,
			type: 'geo',
			props: { richText: toRichText('saved') },
		})
		const textId = createShapeId('t')
		editor.createShape({
			id: textId,
			type: 'text',
			x: 10,
			y: 10,
			props: { richText: toRichText('hi') },
		})
		const shapesBefore = editor.getCurrentPageShapes()

		const json = await serializeTldrawJson(editor)
		const parsed = parseTldrawJsonFile({ json, schema: editor.store.schema })
		expect(parsed.ok).toBe(true)
		if (!parsed.ok) throw new Error('parse failed')

		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		expect(editor.getCurrentPageShapeIds().size).toBe(0)

		editor.loadSnapshot(parsed.value.getStoreSnapshot())
		const byId = (shapes: { id: string }[]) => [...shapes].sort((a, b) => a.id.localeCompare(b.id))
		expect(byId(editor.getCurrentPageShapes())).toEqual(byId(shapesBefore))
	})
})

describe('headless editor disposal', () => {
	it('leaves no pending editor timers behind', () => {
		type AnyFn = (...args: unknown[]) => unknown
		const win = window as unknown as Record<string, AnyFn>
		const g = globalThis as unknown as Record<string, AnyFn>
		const originals = {
			setTimeout: win.setTimeout,
			setInterval: win.setInterval,
			requestAnimationFrame: win.requestAnimationFrame,
			clearTimeout: g.clearTimeout,
			clearInterval: g.clearInterval,
			cancelAnimationFrame: g.cancelAnimationFrame,
		}
		// Everything the editor schedules goes through window.* (Timers) and is cleared through the
		// bare globals (Timers.dispose), so tracking both sides sees exactly the editor's timers.
		const live = new Set<unknown>()
		win.setTimeout = (handler, ...rest) => {
			const id: unknown = originals.setTimeout(
				(...args: unknown[]) => {
					live.delete(id)
					return (handler as AnyFn)(...args)
				},
				...rest
			)
			live.add(id)
			return id
		}
		win.setInterval = (...args) => {
			const id = originals.setInterval(...args)
			live.add(id)
			return id
		}
		win.requestAnimationFrame = (callback) => {
			const id: unknown = originals.requestAnimationFrame((time: unknown) => {
				live.delete(id)
				return (callback as AnyFn)(time)
			})
			live.add(id)
			return id
		}
		g.clearTimeout = (id) => {
			live.delete(id)
			return originals.clearTimeout(id)
		}
		g.clearInterval = (id) => {
			live.delete(id)
			return originals.clearInterval(id)
		}
		g.cancelAnimationFrame = (id) => {
			live.delete(id)
			return originals.cancelAnimationFrame(id)
		}
		try {
			const tui = createTuiEditor({ colorMode: 'light', cols: 100, rows: 30 })
			const { editor } = tui
			// Arm what an interactive session leaves behind: the click manager's 450/200 ms timers, the
			// 150 ms modifier release, hover and the collaborator interval from construction.
			editor.dispatch(ptr('pointer_move', 50, 50))
			tick(editor)
			editor.dispatch(ptr('pointer_down', 50, 50))
			editor.dispatch(ptr('pointer_up', 50, 50))
			tick(editor)
			wheel(editor, 50, 50, { x: 0, y: -16, z: -0.1 }, true)
			expect(live.size).toBeGreaterThan(0)

			tui.dispose()
			expect(editor.isDisposed).toBe(true)
			expect(live.size).toBe(0)
			expect(tui.container.isConnected).toBe(false)
			// Disposing twice is harmless.
			tui.dispose()
		} finally {
			win.setTimeout = originals.setTimeout
			win.setInterval = originals.setInterval
			win.requestAnimationFrame = originals.requestAnimationFrame
			g.clearTimeout = originals.clearTimeout
			g.clearInterval = originals.clearInterval
			g.cancelAnimationFrame = originals.cancelAnimationFrame
		}
	})
})
