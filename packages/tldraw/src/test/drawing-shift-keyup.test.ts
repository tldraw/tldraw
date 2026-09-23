import { TLDrawShape, TLHighlightShape, last } from '@tldraw/editor'
import { vi } from 'vitest'
import { base64ToPoints } from '../lib/utils/test-helpers'
import { TestEditor } from './TestEditor'

vi.useFakeTimers()

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

type DrawableShape = TLDrawShape | TLHighlightShape

for (const toolType of ['draw', 'highlight'] as const) {
	describe(`When ${toolType}ing...`, () => {
		it('keeps the stroke updating after a quick shift release during a straight segment', () => {
			editor
				.setCurrentTool(toolType)
				.pointerDown(10, 10)
				.pointerMove(20, 20)
				.keyDown('Shift')
				.pointerMove(40, 40)
				// straight segment committed; release shift before moving (starting_free)
				.keyUp('Shift')
				// tap shift again before the free segment starts: starting_free -> starting_straight -> ?
				.keyDown('Shift')
				.keyUp('Shift')
				.pointerMove(50, 50)
				.pointerMove(60, 60)
				.pointerMove(70, 70)

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.map((s) => s.type)).toEqual(['free', 'straight', 'free'])

			const before = base64ToPoints(
				last(shape.props.segments)!.path,
				last(shape.props.segments)!.dim
			)

			editor.pointerMove(80, 80).pointerMove(90, 90)

			const updated = editor.getCurrentPageShapes()[0] as DrawableShape
			const after = base64ToPoints(
				last(updated.props.segments)!.path,
				last(updated.props.segments)!.dim
			)
			// the free segment keeps growing and following the pointer
			expect(after.length).toBe(before.length + 2)
			expect(last(after)!.x).toBeCloseTo(last(before)!.x + 20, 0)
			expect(last(after)!.y).toBeCloseTo(last(before)!.y + 20, 0)
		})

		it('goes back to free when shift is released before the straight segment starts', () => {
			editor
				.setCurrentTool(toolType)
				.pointerDown(10, 10)
				.pointerMove(20, 20)
				.keyDown('Shift')
				.keyUp('Shift')

			const shape = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(shape.props.segments.map((s) => s.type)).toEqual(['free'])
			const before = base64ToPoints(shape.props.segments[0].path, shape.props.segments[0].dim)

			editor.pointerMove(30, 30).pointerMove(40, 40)

			const updated = editor.getCurrentPageShapes()[0] as DrawableShape
			expect(updated.props.segments.map((s) => s.type)).toEqual(['free'])
			const after = base64ToPoints(updated.props.segments[0].path, updated.props.segments[0].dim)
			expect(after.length).toBe(before.length + 2)
		})
	})
}
