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
