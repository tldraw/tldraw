import { vi } from 'vitest'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLClickEventInfo,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLShape,
	createShapeId,
} from '../..'
import { TestEditor } from '../test/TestEditor'
import { StateNode } from './tools/StateNode'

const BOX_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, text: '', isFilled: true }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

const toolEvents = {
	onCancel: vi.fn(),
	onComplete: vi.fn(),
	onKeyDown: vi.fn<(info: TLKeyboardEventInfo) => void>(),
	onKeyUp: vi.fn<(info: TLKeyboardEventInfo) => void>(),
	onPointerDown: vi.fn<(info: TLPointerEventInfo) => void>(),
	onDoubleClick: vi.fn<(info: TLClickEventInfo) => void>(),
}

class SpyTool extends StateNode {
	static override id = 'spy'
	override onCancel() {
		toolEvents.onCancel()
	}
	override onComplete() {
		toolEvents.onComplete()
	}
	override onKeyDown(info: TLKeyboardEventInfo) {
		toolEvents.onKeyDown(info)
	}
	override onKeyUp(info: TLKeyboardEventInfo) {
		toolEvents.onKeyUp(info)
	}
	override onPointerDown(info: TLPointerEventInfo) {
		toolEvents.onPointerDown(info)
	}
	override onDoubleClick(info: TLClickEventInfo) {
		toolEvents.onDoubleClick(info)
	}
}

const noModifiers = {
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	accelKey: false,
}

function keyboard(
	name: 'key_down' | 'key_up',
	key: string,
	code: string,
	modifiers: Partial<typeof noModifiers> = {}
): TLKeyboardEventInfo {
	return { type: 'keyboard', name, key, code, ...noModifiers, ...modifiers }
}

function pointer(
	name: 'pointer_down' | 'pointer_up' | 'pointer_move',
	point = { x: 10, y: 10 },
	modifiers: Partial<typeof noModifiers> = {}
): TLPointerEventInfo {
	return {
		type: 'pointer',
		name,
		point,
		pointerId: 1,
		button: 0,
		isPen: false,
		target: 'canvas',
		...noModifiers,
		...modifiers,
	}
}

vi.useFakeTimers()

let editor: TestEditor

beforeEach(() => {
	for (const spy of Object.values(toolEvents)) spy.mockClear()
	editor = new TestEditor({ shapeUtils: [BoxShapeUtil], tools: [SpyTool], initialState: 'spy' })
	document.body.appendChild(editor.getContainer())
})

afterEach(() => {
	editor.getContainer().remove()
	editor.dispose()
})

describe('cancel', () => {
	it('dispatches a cancel event to the current tool and listeners', () => {
		const onEvent = vi.fn()
		editor.on('event', onEvent)
		expect(editor.cancel()).toBe(editor)
		expect(toolEvents.onCancel).toHaveBeenCalledTimes(1)
		expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'misc', name: 'cancel' }))
	})

	it('stops any dragging and panning in progress', () => {
		editor.inputs.setIsDragging(true)
		editor.inputs.setIsPanning(true)
		editor.inputs.setIsSpacebarPanning(true)
		editor.cancel()
		expect(editor.inputs.getIsDragging()).toBe(false)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.inputs.getIsSpacebarPanning()).toBe(false)
	})
})

describe('focus and blur', () => {
	it('focuses the editor and its container', () => {
		expect(editor.getIsFocused()).toBe(false)
		expect(editor.focus()).toBe(editor)
		expect(editor.getIsFocused()).toBe(true)
		expect(document.activeElement).toBe(editor.getContainer())
	})

	it('can focus the editor without focusing the container', () => {
		editor.focus({ focusContainer: false })
		expect(editor.getIsFocused()).toBe(true)
		expect(document.activeElement).not.toBe(editor.getContainer())
	})

	it('does nothing when already focused', () => {
		editor.focus()
		const focusSpy = vi.spyOn(editor.getContainer(), 'focus')
		editor.focus()
		expect(focusSpy).not.toHaveBeenCalled()
		focusSpy.mockRestore()
	})

	it('blurs the editor, completing the current interaction and blurring the container', () => {
		editor.focus()
		expect(editor.blur()).toBe(editor)
		expect(editor.getIsFocused()).toBe(false)
		expect(toolEvents.onComplete).toHaveBeenCalledTimes(1)
		expect(document.activeElement).not.toBe(editor.getContainer())
	})

	it('can blur the editor without blurring the container', () => {
		editor.focus()
		editor.blur({ blurContainer: false })
		expect(editor.getIsFocused()).toBe(false)
		expect(document.activeElement).toBe(editor.getContainer())
	})

	it('does nothing when not focused', () => {
		editor.blur()
		expect(toolEvents.onComplete).not.toHaveBeenCalled()
	})
})

describe('cancelDoubleClick', () => {
	it('turns the next click into a double click unless the double click is cancelled', () => {
		editor.dispatch(pointer('pointer_down'))
		editor.dispatch(pointer('pointer_up'))
		editor.dispatch(pointer('pointer_down'))
		expect(toolEvents.onDoubleClick).toHaveBeenCalledTimes(1)
		expect(toolEvents.onDoubleClick.mock.calls[0][0]).toMatchObject({
			name: 'double_click',
			phase: 'down',
		})
		editor.dispatch(pointer('pointer_up'))
		vi.advanceTimersByTime(editor.options.multiClickDurationMs + 1)

		toolEvents.onDoubleClick.mockClear()
		editor.dispatch(pointer('pointer_down'))
		editor.dispatch(pointer('pointer_up'))
		editor.cancelDoubleClick()
		editor.dispatch(pointer('pointer_down'))
		editor.dispatch(pointer('pointer_up'))
		expect(toolEvents.onDoubleClick).not.toHaveBeenCalled()
		expect(toolEvents.onPointerDown).toHaveBeenCalledTimes(4)
	})
})

describe('modifier key release', () => {
	it.each([
		['Shift', 'ShiftLeft', 'shiftKey', () => editor.inputs.getShiftKey()],
		['Alt', 'AltLeft', 'altKey', () => editor.inputs.getAltKey()],
		['Control', 'ControlLeft', 'ctrlKey', () => editor.inputs.getCtrlKey()],
		['Meta', 'MetaLeft', 'metaKey', () => editor.inputs.getMetaKey()],
	] as const)('%s is released 150ms after its key up', (key, code, modifier, getModifier) => {
		editor.dispatch(keyboard('key_down', key, code, { [modifier]: true }))
		expect(getModifier()).toBe(true)
		expect(editor.inputs.keys.has(code)).toBe(true)
		expect(toolEvents.onKeyDown).toHaveBeenCalledTimes(1)

		editor.dispatch(keyboard('key_up', key, code))
		expect(editor.inputs.keys.has(code)).toBe(false)
		expect(toolEvents.onKeyUp).toHaveBeenCalledTimes(1)
		// the modifier lingers so that a pointer event in the same gesture still sees it
		expect(getModifier()).toBe(true)

		vi.advanceTimersByTime(149)
		expect(getModifier()).toBe(true)

		vi.advanceTimersByTime(1)
		expect(getModifier()).toBe(false)
		// the release dispatches a synthetic key up for the modifier
		expect(toolEvents.onKeyUp).toHaveBeenCalledTimes(2)
		expect(toolEvents.onKeyUp.mock.calls[1][0]).toMatchObject({
			type: 'keyboard',
			name: 'key_up',
			code,
			[modifier]: false,
		})
	})

	it('the synthetic key up reports the modifiers that are still held', () => {
		editor.dispatch(keyboard('key_down', 'Shift', 'ShiftLeft', { shiftKey: true }))
		editor.dispatch(keyboard('key_down', 'Alt', 'AltLeft', { shiftKey: true, altKey: true }))
		editor.dispatch(keyboard('key_up', 'Alt', 'AltLeft', { shiftKey: true }))
		vi.advanceTimersByTime(150)
		expect(editor.inputs.getAltKey()).toBe(false)
		expect(editor.inputs.getShiftKey()).toBe(true)
		expect(toolEvents.onKeyUp.mock.calls.at(-1)![0]).toMatchObject({
			key: 'Alt',
			code: 'AltLeft',
			altKey: false,
			shiftKey: true,
		})
	})

	it('keeps the modifier held when the key is pressed again before the release', () => {
		editor.dispatch(keyboard('key_down', 'Shift', 'ShiftLeft', { shiftKey: true }))
		editor.dispatch(keyboard('key_up', 'Shift', 'ShiftLeft'))
		vi.advanceTimersByTime(100)
		editor.dispatch(keyboard('key_down', 'Shift', 'ShiftLeft', { shiftKey: true }))
		vi.advanceTimersByTime(200)
		expect(editor.inputs.getShiftKey()).toBe(true)
		expect(toolEvents.onKeyUp).toHaveBeenCalledTimes(1)
	})

	it('releases a pending modifier immediately when a pointer down starts a new interaction', () => {
		editor.dispatch(keyboard('key_down', 'Shift', 'ShiftLeft', { shiftKey: true }))
		editor.dispatch(keyboard('key_up', 'Shift', 'ShiftLeft'))
		expect(editor.inputs.getShiftKey()).toBe(true)

		editor.dispatch(pointer('pointer_down'))
		expect(editor.inputs.getShiftKey()).toBe(false)
		expect(toolEvents.onKeyUp).toHaveBeenCalledTimes(2)
		expect(toolEvents.onKeyUp.mock.calls[1][0]).toMatchObject({
			code: 'ShiftLeft',
			shiftKey: false,
		})
		expect(toolEvents.onPointerDown.mock.calls[0][0]).toMatchObject({ shiftKey: false })
		// the pointer down released the key; the timer must not fire a second synthetic key up
		vi.advanceTimersByTime(150)
		expect(toolEvents.onKeyUp).toHaveBeenCalledTimes(2)
	})

	it('leaves a genuinely held modifier alone on pointer down', () => {
		editor.dispatch(keyboard('key_down', 'Shift', 'ShiftLeft', { shiftKey: true }))
		editor.dispatch(pointer('pointer_down', { x: 10, y: 10 }, { shiftKey: true }))
		expect(editor.inputs.getShiftKey()).toBe(true)
		expect(toolEvents.onKeyUp).not.toHaveBeenCalled()
	})

	it('keeps the meta key held while a key up still reports it', () => {
		editor.dispatch(keyboard('key_down', 'Meta', 'MetaLeft', { metaKey: true }))
		// browsers report metaKey as still pressed on the key up of the meta key itself
		editor.dispatch(keyboard('key_up', 'Meta', 'MetaLeft', { metaKey: true }))
		vi.advanceTimersByTime(150)
		expect(editor.inputs.getMetaKey()).toBe(true)

		editor.dispatch(keyboard('key_up', 'a', 'KeyA'))
		vi.advanceTimersByTime(150)
		expect(editor.inputs.getMetaKey()).toBe(false)
	})
})

describe('pointer down on a shape', () => {
	it('reports the shape to the tool', () => {
		const id = createShapeId('a')
		editor.createShape({ id, type: BOX_TYPE })
		editor.dispatch({ ...pointer('pointer_down'), target: 'shape', shape: editor.getShape(id)! })
		expect(toolEvents.onPointerDown.mock.calls[0][0]).toMatchObject({
			target: 'shape',
			shape: { id },
		})
	})
})
