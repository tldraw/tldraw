import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

vi.useFakeTimers()

// Modifier state mirrors the flags on the most recent event, so it updates immediately — no
// debounce, and no pointer move needed to clear after a key release.

it('Shift Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { shiftKey: true })
	expect(editor.inputs.getShiftKey()).toBe(true)
	editor.pointerMove(100, 100, { shiftKey: false })
	expect(editor.inputs.getShiftKey()).toBe(false)
})

it('Alt Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { altKey: true })
	expect(editor.inputs.getAltKey()).toBe(true)
	editor.pointerMove(100, 100, { altKey: false })
	expect(editor.inputs.getAltKey()).toBe(false)
})

it('Ctrl Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { ctrlKey: true })
	expect(editor.inputs.getCtrlKey()).toBe(true)
	editor.pointerMove(100, 100, { ctrlKey: false })
	expect(editor.inputs.getCtrlKey()).toBe(false)
})

it('Meta Key', () => {
	// cmd sets both meta and ctrl (ctrlKey is normalized to metaKey || ctrlKey)
	editor.keyDown('Meta')
	expect(editor.inputs.getMetaKey()).toBe(true)
	expect(editor.inputs.getCtrlKey()).toBe(true)
	expect(editor.inputs.getAccelKey()).toBe(true)

	// releasing cmd clears meta/ctrl/accel immediately, with no pointer move. (This used to get
	// stuck true on macOS until the next pointer event.)
	editor.keyUp('Meta')
	expect(editor.inputs.getMetaKey()).toBe(false)
	expect(editor.inputs.getCtrlKey()).toBe(false)
	expect(editor.inputs.getAccelKey()).toBe(false)
})
