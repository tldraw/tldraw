import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

vi.useFakeTimers()

it('Shift Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { shiftKey: true })
	editor.pointerMove(100, 100, { shiftKey: false })
	expect(editor.inputs.getShiftKey()).toBe(true)
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getShiftKey()).toBe(false)
})

it('Alt Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { altKey: true })
	editor.pointerMove(100, 100, { altKey: false })
	expect(editor.inputs.getAltKey()).toBe(true)
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getAltKey()).toBe(false)
})

it('Ctrl Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { ctrlKey: true })
	editor.pointerMove(100, 100, { ctrlKey: false })
	expect(editor.inputs.getCtrlKey()).toBe(true)
	vi.advanceTimersByTime(200)
	expect(editor.inputs.getCtrlKey()).toBe(false)
})

it('Meta key down sets meta, ctrl, and accel keys', () => {
	editor.keyDown('Meta')
	expect(editor.inputs.getMetaKey()).toBe(true)
	expect(editor.inputs.getCtrlKey()).toBe(true)
	expect(editor.inputs.getAccelKey()).toBe(true)
})

it('Meta key clears on keyup without needing a pointer move', () => {
	editor.keyDown('Meta')
	expect(editor.inputs.getMetaKey()).toBe(true)

	editor.keyUp('Meta')

	expect(editor.inputs.getMetaKey()).toBe(false)
	expect(editor.inputs.getCtrlKey()).toBe(false)
	expect(editor.inputs.getAccelKey()).toBe(false)
})

it('Control key clears on keyup without needing a pointer move', () => {
	editor.keyDown('Control')
	expect(editor.inputs.getCtrlKey()).toBe(true)

	editor.keyUp('Control')

	expect(editor.inputs.getCtrlKey()).toBe(false)
	expect(editor.inputs.getMetaKey()).toBe(false)
})

it('does not emit a phantom ctrl keyup when releasing meta', () => {
	const keyUpKeys: string[] = []
	editor.on('event', (info) => {
		if (info.type === 'keyboard' && info.name === 'key_up') keyUpKeys.push(info.key)
	})

	editor.keyDown('Meta')
	editor.keyUp('Meta')
	vi.advanceTimersByTime(200)

	expect(keyUpKeys).toContain('Meta')
	expect(keyUpKeys).not.toContain('Ctrl')
})
