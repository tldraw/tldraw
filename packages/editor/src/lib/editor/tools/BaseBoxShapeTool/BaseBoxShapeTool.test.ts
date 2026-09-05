import { RecordProps, TLShape, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { BaseBoxShapeUtil } from '../../shapes/BaseBoxShapeUtil'
import { TLPointerEventInfo } from '../../types/event-types'
import { StateNode } from '../StateNode'
import { BaseBoxShapeTool } from './BaseBoxShapeTool'

const BOX_TYPE = 'test-tool-box'
const TOOL_ID = 'test-box-tool'
const CALLBACK_TOOL_ID = 'test-box-tool-with-callback'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; scale: number }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>

class TestBoxShapeUtil extends BaseBoxShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = { w: T.number, h: T.number, scale: T.number }
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 50, scale: 1 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {
		return null
	}
}

class TestBoxTool extends BaseBoxShapeTool {
	static override id = TOOL_ID
	override shapeType: typeof BOX_TYPE = BOX_TYPE
}

const onCreate = vi.fn()

class TestBoxToolWithCallback extends BaseBoxShapeTool {
	static override id = CALLBACK_TOOL_ID
	override shapeType: typeof BOX_TYPE = BOX_TYPE
	override onCreate(shape: TLShape | null) {
		onCreate(shape)
	}
}

// A stand-in for the select tool from the tldraw package: the box tool hands
// off to `select.resizing` once a drag starts, so capture what it was given.
let resizingEnterInfo: any = null

class SelectIdle extends StateNode {
	static override id = 'idle'
}

class SelectResizing extends StateNode {
	static override id = 'resizing'
	override onEnter(info: any) {
		resizingEnterInfo = info
	}
}

class SelectTool extends StateNode {
	static override id = 'select'
	static override initial = 'idle'
	static override children() {
		return [SelectIdle, SelectResizing]
	}
}

type Modifiers = Partial<Pick<TLPointerEventInfo, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>>

function pointerEvent(
	name: TLPointerEventInfo['name'],
	x: number,
	y: number,
	modifiers: Modifiers = {}
): TLPointerEventInfo {
	return {
		type: 'pointer',
		name,
		target: 'canvas',
		point: { x, y },
		pointerId: 1,
		button: 0,
		isPen: false,
		isPenDirect: false,
		shiftKey: false,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		accelKey: false,
		...modifiers,
	}
}

let editor: TestEditor

function pointerDown(x: number, y: number, modifiers?: Modifiers) {
	editor.dispatch(pointerEvent('pointer_down', x, y, modifiers))
	editor.emit('tick', 16)
}

function pointerMove(x: number, y: number, modifiers?: Modifiers) {
	editor.dispatch(pointerEvent('pointer_move', x, y, modifiers))
	editor.emit('tick', 16)
}

function pointerUp(x: number, y: number, modifiers?: Modifiers) {
	editor.dispatch(pointerEvent('pointer_up', x, y, modifiers))
	editor.emit('tick', 16)
}

function getBoxes() {
	return editor.getCurrentPageShapes().filter((s): s is IBoxShape => s.type === BOX_TYPE)
}

function getOnlyBox() {
	const boxes = getBoxes()
	expect(boxes).toHaveLength(1)
	return boxes[0]
}

beforeEach(() => {
	vi.useFakeTimers()
	resizingEnterInfo = null
	onCreate.mockClear()
	editor = new TestEditor({
		shapeUtils: [TestBoxShapeUtil],
		tools: [SelectTool, TestBoxTool, TestBoxToolWithCallback],
		initialState: 'select',
	})
	editor.setCurrentTool(TOOL_ID)
})

afterEach(() => {
	editor.dispose()
	vi.useRealTimers()
})

describe('BaseBoxShapeTool', () => {
	it('starts idle with a crosshair cursor', () => {
		expect(editor.getPath()).toBe(`${TOOL_ID}.idle`)
		expect(editor.getInstanceState().cursor).toEqual({ type: 'cross', rotation: 0 })
	})

	it('returns to the select tool when cancelled while idle', () => {
		editor.cancel()
		expect(editor.getPath()).toBe('select.idle')
	})

	it('enters pointing on pointer down', () => {
		pointerDown(100, 100)
		expect(editor.getPath()).toBe(`${TOOL_ID}.pointing`)
		expect(getBoxes()).toHaveLength(0)
	})

	describe('click', () => {
		it('creates a default-size shape centred on the point and selects it', () => {
			pointerDown(100, 100)
			pointerUp(100, 100)

			const box = getOnlyBox()
			expect(box).toMatchObject({ x: 50, y: 75, props: { w: 100, h: 50, scale: 1 } })
			expect(editor.getSelectedShapeIds()).toEqual([box.id])
			expect(editor.getPath()).toBe('select.idle')
		})

		it('uses the pointer-down point even if the pointer moved slightly before release', () => {
			pointerDown(100, 100)
			pointerMove(102, 101)
			expect(editor.inputs.getIsDragging()).toBe(false)
			pointerUp(102, 101)

			expect(getOnlyBox()).toMatchObject({ x: 50, y: 75 })
		})

		it('stays in the tool when the tool is locked', () => {
			editor.updateInstanceState({ isToolLocked: true })
			pointerDown(100, 100)
			pointerUp(100, 100)

			expect(getBoxes()).toHaveLength(1)
			expect(editor.getPath()).toBe(`${TOOL_ID}.idle`)
		})

		it('accounts for the camera when placing the shape', () => {
			editor.setCamera({ x: -100, y: -200, z: 2 })
			pointerDown(100, 100)
			pointerUp(100, 100)

			// screen (100, 100) at zoom 2 with camera (-100, -200) is page (150, 250)
			expect(getOnlyBox()).toMatchObject({ x: 100, y: 225, props: { w: 100, h: 50 } })
		})

		it('snaps the top-left corner to the grid in grid mode', () => {
			editor.updateInstanceState({ isGridMode: true })
			expect(editor.getDocumentSettings().gridSize).toBe(10)
			pointerDown(103, 107)
			pointerUp(103, 107)

			// centred would be (53, 82)
			expect(getOnlyBox()).toMatchObject({ x: 50, y: 80, props: { w: 100, h: 50 } })
		})

		it('scales the shape by the inverse zoom in dynamic size mode', () => {
			editor.user.updateUserPreferences({ isDynamicSizeMode: true })
			editor.setCamera({ x: 0, y: 0, z: 2 })
			expect(editor.getResizeScaleFactor()).toBe(0.5)
			pointerDown(100, 100)
			pointerUp(100, 100)

			// page point (50, 50); size halves to 50x25 and stays centred
			expect(getOnlyBox()).toMatchObject({
				x: 25,
				y: 37.5,
				props: { w: 50, h: 25, scale: 0.5 },
			})
		})

		it('keeps the shape centred on the point inside a rotated focused group', () => {
			const a = createShapeId('a')
			const b = createShapeId('b')
			const groupId = createShapeId('group')
			editor.createShapes([
				{ id: a, type: BOX_TYPE, x: 0, y: 0 },
				{ id: b, type: BOX_TYPE, x: 300, y: 300 },
			])
			editor.setCurrentTool('select')
			editor.groupShapes([a, b], { groupId })
			editor.updateShape({ id: groupId, type: 'group', rotation: Math.PI / 2 })
			editor.setFocusedGroup(groupId)
			editor.setCurrentTool(TOOL_ID)

			pointerDown(100, 100)
			pointerUp(100, 100)

			const box = getBoxes().find((s) => s.id !== a && s.id !== b)!
			expect(box.parentId).toBe(groupId)
			const bounds = editor.getShapePageBounds(box)!
			expect(bounds.x).toBeCloseTo(50)
			expect(bounds.y).toBeCloseTo(75)
			expect(bounds.w).toBeCloseTo(100)
			expect(bounds.h).toBeCloseTo(50)
		})

		it('creates nothing and returns to idle when the page is full', () => {
			const full = new TestEditor({
				shapeUtils: [TestBoxShapeUtil],
				tools: [SelectTool, TestBoxTool],
				initialState: 'select',
				options: { maxShapesPerPage: 1 },
			})
			const alert = vi.fn()
			full.on('max-shapes', alert)
			try {
				full.createShape({ id: createShapeId('existing'), type: BOX_TYPE, x: 0, y: 0 })
				full.setCurrentTool(TOOL_ID)
				full.dispatch(pointerEvent('pointer_down', 100, 100))
				full.dispatch(pointerEvent('pointer_up', 100, 100))

				expect(full.getCurrentPageShapeIds().size).toBe(1)
				expect(alert).toHaveBeenCalledTimes(1)
				expect(full.getPath()).toBe(`${TOOL_ID}.idle`)
			} finally {
				full.dispose()
			}
		})

		it('does not call onCreate for a click (the select tool owns that handoff)', () => {
			editor.setCurrentTool(CALLBACK_TOOL_ID)
			pointerDown(100, 100)
			pointerUp(100, 100)
			expect(getBoxes()).toHaveLength(1)
			expect(onCreate).not.toHaveBeenCalled()
		})
	})

	describe('drag', () => {
		it('creates a 1x1 shape at the origin and hands off to select.resizing', () => {
			pointerDown(100, 100)
			pointerMove(150, 150)

			const box = getOnlyBox()
			expect(box).toMatchObject({ x: 100, y: 100, props: { w: 1, h: 1 } })
			expect(editor.getSelectedShapeIds()).toEqual([box.id])
			expect(editor.getPath()).toBe('select.resizing')
			expect(resizingEnterInfo).toMatchObject({
				type: 'pointer',
				name: 'pointer_move',
				target: 'selection',
				handle: 'bottom_right',
				isCreating: true,
				creationCursorOffset: { x: 1, y: 1 },
				onInteractionEnd: TOOL_ID,
				onCreate: undefined,
			})
			expect(resizingEnterInfo.creatingMarkId).toContain('creating_box:')
		})

		it('does not start until the pointer has moved past the drag distance', () => {
			pointerDown(100, 100)
			pointerMove(103, 100)
			expect(editor.getPath()).toBe(`${TOOL_ID}.pointing`)
			expect(getBoxes()).toHaveLength(0)

			pointerMove(105, 100)
			expect(editor.getPath()).toBe('select.resizing')
			expect(getBoxes()).toHaveLength(1)
		})

		it('uses the larger coarse-pointer drag distance on touch', () => {
			editor.updateInstanceState({ isCoarsePointer: true })
			pointerDown(100, 100)
			pointerMove(105, 100)
			expect(editor.getPath()).toBe(`${TOOL_ID}.pointing`)

			pointerMove(107, 100)
			expect(editor.getPath()).toBe('select.resizing')
		})

		it('snaps the origin to the grid in grid mode', () => {
			editor.updateInstanceState({ isGridMode: true })
			pointerDown(103, 107)
			pointerMove(200, 200)
			expect(getOnlyBox()).toMatchObject({ x: 100, y: 110, props: { w: 1, h: 1 } })
		})

		it('passes the modifier keys through to the resizing state', () => {
			pointerDown(100, 100, { shiftKey: true })
			pointerMove(150, 150, { shiftKey: true })
			expect(resizingEnterInfo).toMatchObject({ shiftKey: true, isCreating: true })
		})

		it('forwards onCreate to the tool when the tool defines it', () => {
			editor.setCurrentTool(CALLBACK_TOOL_ID)
			pointerDown(100, 100)
			pointerMove(150, 150)

			expect(resizingEnterInfo.onInteractionEnd).toBe(CALLBACK_TOOL_ID)
			expect(typeof resizingEnterInfo.onCreate).toBe('function')

			const box = getOnlyBox()
			resizingEnterInfo.onCreate(box)
			expect(onCreate).toHaveBeenCalledWith(box)
		})

		it('marks a history stopping point before creating the shape', () => {
			const mark = vi.spyOn(editor, 'markHistoryStoppingPoint')
			try {
				pointerDown(100, 100)
				pointerMove(150, 150)
				expect(mark).toHaveBeenCalledTimes(1)
				expect(mark).toHaveBeenCalledWith(expect.stringContaining('creating_box:shape:'))
				expect(resizingEnterInfo.creatingMarkId).toBe(mark.mock.results[0].value)
			} finally {
				mark.mockRestore()
			}
		})
	})

	describe('leaving pointing without a release', () => {
		it.each(['cancel', 'interrupt', 'complete'] as const)(
			'%s leaves no shape behind and returns to idle',
			(event) => {
				pointerDown(100, 100)
				editor[event]()
				expect(getBoxes()).toHaveLength(0)
				expect(editor.getPath()).toBe(`${TOOL_ID}.idle`)
			}
		)

		it('a long press with a coarse pointer cancels the pending shape', () => {
			editor.updateInstanceState({ isCoarsePointer: true })
			pointerDown(100, 100)
			vi.advanceTimersByTime(editor.options.longPressDurationMs + 1)

			expect(editor.getPath()).toBe(`${TOOL_ID}.idle`)
			pointerUp(100, 100)
			expect(getBoxes()).toHaveLength(0)
		})

		it('a long press with a fine pointer keeps pointing so the release still creates', () => {
			pointerDown(100, 100)
			vi.advanceTimersByTime(editor.options.longPressDurationMs + 1)

			expect(editor.getPath()).toBe(`${TOOL_ID}.pointing`)
			pointerUp(100, 100)
			expect(getBoxes()).toHaveLength(1)
		})
	})
})
