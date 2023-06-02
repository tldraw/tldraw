import { TestEditor } from './TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

jest.useFakeTimers()

it('Shift Key', () => {
	app.pointerDown(0, 0)
	app.pointerMove(100, 100, { shiftKey: true })
	app.pointerMove(100, 100, { shiftKey: false })
	expect(app.inputs.shiftKey).toBe(true)
	jest.advanceTimersByTime(200)
	expect(app.inputs.shiftKey).toBe(false)
})

it('Alt Key', () => {
	app.pointerDown(0, 0)
	app.pointerMove(100, 100, { altKey: true })
	app.pointerMove(100, 100, { altKey: false })
	expect(app.inputs.altKey).toBe(true)
	jest.advanceTimersByTime(200)
	expect(app.inputs.altKey).toBe(false)
})

it('Ctrl Key', () => {
	app.pointerDown(0, 0)
	app.pointerMove(100, 100, { ctrlKey: true })
	app.pointerMove(100, 100, { ctrlKey: false })
	expect(app.inputs.ctrlKey).toBe(true)
	jest.advanceTimersByTime(200)
	expect(app.inputs.ctrlKey).toBe(false)
})
