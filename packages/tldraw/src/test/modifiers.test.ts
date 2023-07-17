import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

jest.useFakeTimers()

it('Shift Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { shiftKey: true })
	editor.pointerMove(100, 100, { shiftKey: false })
	expect(editor.inputs.shiftKey).toBe(true)
	jest.advanceTimersByTime(200)
	expect(editor.inputs.shiftKey).toBe(false)
})

it('Alt Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { altKey: true })
	editor.pointerMove(100, 100, { altKey: false })
	expect(editor.inputs.altKey).toBe(true)
	jest.advanceTimersByTime(200)
	expect(editor.inputs.altKey).toBe(false)
})

it('Ctrl Key', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100, { ctrlKey: true })
	editor.pointerMove(100, 100, { ctrlKey: false })
	expect(editor.inputs.ctrlKey).toBe(true)
	jest.advanceTimersByTime(200)
	expect(editor.inputs.ctrlKey).toBe(false)
})
