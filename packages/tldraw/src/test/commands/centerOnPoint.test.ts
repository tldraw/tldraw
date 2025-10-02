import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('centers on the point', () => {
	editor.centerOnPoint({ x: 400, y: 400 })
	expect(editor.getViewportPageCenter()).toMatchObject({ x: 400, y: 400 })
})

it('centers on the point with animation', () => {
	editor.centerOnPoint({ x: 400, y: 400 }, { animation: { duration: 200 } })
	expect(editor.getViewportPageCenter()).not.toMatchObject({ x: 400, y: 400 })
	vi.advanceTimersByTime(100)
	expect(editor.getViewportPageCenter()).not.toMatchObject({ x: 400, y: 400 })
	vi.advanceTimersByTime(200)
	expect(editor.getViewportPageCenter()).toMatchObject({ x: 400, y: 400 })
})

it('is not undoable', () => {
	editor.markHistoryStoppingPoint()
	editor.centerOnPoint({ x: 400, y: 400 })
	editor.undo()
	expect(editor.getViewportPageCenter()).toMatchObject({ x: 400, y: 400 })
})
