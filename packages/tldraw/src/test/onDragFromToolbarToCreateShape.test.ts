import { createShapeId, TLPointerEventInfo } from '@tldraw/editor'
import { onDragFromToolbarToCreateShape } from '../lib/ui/hooks/useTools'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

function dragInfo(): TLPointerEventInfo {
	return {
		type: 'pointer',
		name: 'pointer_move',
		button: 0,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		accelKey: false,
		shiftKey: false,
		isPen: false,
		point: { x: 100, y: 100 },
		pointerId: 0,
		target: 'canvas',
	}
}

describe('onDragFromToolbarToCreateShape', () => {
	it('creates a shape and enters translating when the shape is created', () => {
		editor.pointerMove(100, 100)
		onDragFromToolbarToCreateShape(editor, dragInfo(), {
			createShape: (id) =>
				editor.createShape({ id, type: 'geo', props: { w: 200, h: 200, geo: 'rectangle' } }),
		})
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.expectToBeIn('select.translating')
	})

	it('does not throw or create a shape in read-only mode (regression: #9116)', () => {
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.getIsReadonly()).toBe(true)

		expect(() =>
			onDragFromToolbarToCreateShape(editor, dragInfo(), {
				createShape: (id) =>
					editor.createShape({ id, type: 'geo', props: { w: 200, h: 200, geo: 'rectangle' } }),
			})
		).not.toThrow()

		expect(editor.getCurrentPageShapes().length).toBe(0)
		// It should not have switched tools either.
		editor.expectToBeIn('select.idle')
	})

	it('bails out gracefully when shape creation does not take effect', () => {
		editor.pointerMove(100, 100)
		// A createShape callback that doesn't actually create the shape (e.g. blocked
		// by a side effect) should not crash the app.
		expect(() =>
			onDragFromToolbarToCreateShape(editor, dragInfo(), {
				createShape: () => {
					// intentionally does nothing
				},
			})
		).not.toThrow()

		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.expectToBeIn('select.idle')
	})

	it('leaves an unrelated existing shape untouched when bailing in read-only mode', () => {
		const id = createShapeId()
		editor.createShape({ id, type: 'geo', props: { w: 100, h: 100, geo: 'rectangle' } })
		editor.updateInstanceState({ isReadonly: true })

		onDragFromToolbarToCreateShape(editor, dragInfo(), {
			createShape: (newId) =>
				editor.createShape({ id: newId, type: 'geo', props: { w: 200, h: 200, geo: 'rectangle' } }),
		})

		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(editor.getShape(id)).toBeDefined()
	})
})
