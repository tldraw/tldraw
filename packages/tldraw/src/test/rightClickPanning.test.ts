import { TestEditor } from './TestEditor'

describe('with rightClickPanning enabled (default)', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	it('pans the camera when right-click dragging past the drag threshold', () => {
		editor.expectCameraToBe(0, 0, 1)
		editor.pointerDown(100, 100, { button: 2 })
		editor.pointerMove(200, 200)
		expect(editor.inputs.getIsPanning()).toBe(true)
		editor.expectCameraToBe(100, 100, 1)
		editor.pointerUp(200, 200, { button: 2 })
		expect(editor.inputs.getIsPanning()).toBe(false)
	})

	it('does not pan on a static right-click', () => {
		editor.pointerDown(100, 100, { button: 2 })
		editor.pointerUp(100, 100, { button: 2 })
		expect(editor.inputs.getIsPanning()).toBe(false)
		editor.expectCameraToBe(0, 0, 1)
	})
})

describe('with rightClickPanning disabled', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor({ options: { rightClickPanning: false } })
	})

	it('does not pan on right-click drag', () => {
		editor.pointerDown(100, 100, { button: 2 })
		editor.pointerMove(200, 200)
		expect(editor.inputs.getIsPanning()).toBe(false)
		editor.expectCameraToBe(0, 0, 1)
		editor.pointerUp(200, 200, { button: 2 })
	})
})
