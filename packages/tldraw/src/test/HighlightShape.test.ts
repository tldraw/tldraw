import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

vi.useFakeTimers()

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

beforeEach(() => {
	editor = new TestEditor()

	editor.createShapes([])
})

describe('Highlight shape', () => {
	it('can be selected by clicking its side', () => {
		editor.setCurrentTool('highlight').pointerDown(60, 60).pointerUp()
		editor.setCurrentTool('select').pointerDown(70, 70).pointerUp()

		expect(editor.getSelectedShapes()).toHaveLength(1)
	})
})
