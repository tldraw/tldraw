import { DefaultTextAlignStyle, TLTextShape, toRichText } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { TextShapeTool } from './TextShapeTool'

let editor: TestEditor
vi.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe(TextShapeTool, () => {
	it('Creates text, edits it, undoes and redoes', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('text')
		editor.expectToBeIn('text.idle')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('text.pointing')
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
		// This comes from the component, not the state chart
		editor.updateShapes<TLTextShape>([
			{
				...editor.getCurrentPageShapes()[0]!,
				type: 'text',
				props: { richText: toRichText('Hello') },
			},
		])
		// Deselect the editing shape
		editor.cancel()
		editor.expectToBeIn('select.idle')
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.expectShapeToMatch({
			id: editor.getCurrentPageShapes()[0].id,
			type: 'text',
			props: { richText: toRichText('Hello') },
		})

		editor.undo()

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.redo()

		expect(editor.getCurrentPageShapes().length).toBe(1)

		editor.expectShapeToMatch({
			id: editor.getCurrentPageShapes()[0].id,
			type: 'text',
			props: { richText: toRichText('Hello') },
		})
	})
})

describe('When selecting the tool', () => {
	it('starts in idle, transitions to pointing and dragging', () => {
		editor.setCurrentTool('text')
		editor.expectToBeIn('text.idle')
	})
})

describe('When in idle state', () => {
	it('Transitions to pointing on pointer down', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('text.pointing')
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
	})

	it('creates a shape on pointer up', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('returns to select on cancel', () => {
		editor.setCurrentTool('text')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('starts editing selected text shape on Enter key', () => {
		// Create a text shape using the same method as other tests
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')

		// Update the text shape with some content
		editor.updateShapes<TLTextShape>([
			{
				...editor.getCurrentPageShapes()[0]!,
				type: 'text',
				props: { richText: toRichText('Hello') },
			},
		])

		// Exit editing mode
		editor.cancel()
		editor.expectToBeIn('select.idle')

		// Verify the text shape exists and is selected
		expect(editor.getCurrentPageShapes().length).toBe(1)
		const textShape = editor.getCurrentPageShapes()[0]
		expect(textShape.type).toBe('text')
		editor.setSelectedShapes([textShape])

		// Switch to text tool and press Enter
		editor.setCurrentTool('text')
		editor.expectToBeIn('text.idle')
		editor.keyDown('Enter')

		// Should transition to editing the selected text shape
		editor.expectToBeIn('select.editing_shape')
		expect(editor.getEditingShapeId()).toBe(textShape.id)
	})

	it('starts editing selected text shape on numpad Enter key', () => {
		// Create a text shape using the same method as other tests
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')

		// Update the text shape with some content
		editor.updateShapes<TLTextShape>([
			{
				...editor.getCurrentPageShapes()[0]!,
				type: 'text',
				props: { richText: toRichText('Hello') },
			},
		])

		// Exit editing mode
		editor.cancel()
		editor.expectToBeIn('select.idle')

		// Verify the text shape exists and is selected
		expect(editor.getCurrentPageShapes().length).toBe(1)
		const textShape = editor.getCurrentPageShapes()[0]
		expect(textShape.type).toBe('text')
		editor.setSelectedShapes([textShape])

		// Switch to text tool and press numpad Enter
		editor.setCurrentTool('text')
		editor.expectToBeIn('text.idle')
		editor.keyDown('Enter', { code: 'NumpadEnter' })

		// Should transition to editing the selected text shape
		editor.expectToBeIn('select.editing_shape')
		expect(editor.getEditingShapeId()).toBe(textShape.id)
	})
})

describe('When in the pointing state', () => {
	it('returns to idle on escape', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.cancel()
		editor.expectToBeIn('text.idle')
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('returns to idle on interrupt', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('text.pointing')
		editor.interrupt()
		editor.expectToBeIn('text.idle')
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('transitions to select.resizing when dragging and edits on pointer up', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)

		// doesn't matter how far we move if we haven't been pointing long enough
		editor.pointerMove(100, 100)
		editor.expectToBeIn('text.pointing')

		// Go back to start and wait a little to satisfy the time requirement
		editor.pointerMove(0, 0)
		vi.advanceTimersByTime(200)

		// y axis doesn't matter
		editor.pointerMove(0, 100)
		editor.expectToBeIn('text.pointing')

		// x axis matters
		editor.pointerMove(0, 10)
		editor.expectToBeIn('text.pointing')

		// needs to be far enough
		editor.pointerMove(100, 0)
		editor.expectToBeIn('select.resizing')

		// Create the shape immediately
		expect(editor.getCurrentPageShapes().length).toBe(1)

		// Go to editing on pointer up
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
	})

	it('on pointer up, preserves the center when the text has a auto width', () => {
		editor.setCurrentTool('text')
		editor.setStyleForNextShapes(DefaultTextAlignStyle, 'middle')
		const x = 0
		const y = 0
		editor.pointerDown(x, y)
		editor.pointerUp()
		const shape = editor.getLastCreatedShape()
		const bounds = editor.getShapePageBounds(shape)!
		expect(shape).toMatchObject({
			x: x - bounds.width / 2,
			y: y - bounds.height / 2,
		})
	})

	it('on pointer up, preserves the center when the text has a auto width (left aligned)', () => {
		editor.setCurrentTool('text')
		editor.setStyleForNextShapes(DefaultTextAlignStyle, 'start')
		const x = 0
		const y = 0
		editor.pointerDown(x, y)
		editor.pointerUp()
		const shape = editor.getLastCreatedShape()
		const bounds = editor.getShapePageBounds(shape)!
		expect(shape).toMatchObject({
			x,
			y: y - bounds.height / 2,
		})
	})

	it('on pointer up, preserves the center when the text has a auto width (right aligned)', () => {
		editor.setCurrentTool('text')
		editor.setStyleForNextShapes(DefaultTextAlignStyle, 'end')
		const x = 0
		const y = 0
		editor.pointerDown(x, y)
		editor.pointerUp()
		const shape = editor.getLastCreatedShape()
		const bounds = editor.getShapePageBounds(shape)!
		expect(shape).toMatchObject({
			x: x - bounds.width,
			y: y - bounds.height / 2,
		})
	})
})

describe('When resizing', () => {
	it('bails on escape while resizing and returns to text.idle', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		vi.advanceTimersByTime(200)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.resizing')
		editor.cancel()
		editor.expectToBeIn('text.idle')
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('does not bails on interrupt while resizing', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		vi.advanceTimersByTime(200)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.resizing')
		editor.interrupt()
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('preserves the top left when the text has a fixed width', () => {
		editor.setCurrentTool('text')
		const x = 0
		const y = 0
		editor.pointerDown(x, y)
		vi.advanceTimersByTime(200)
		editor.pointerMove(x + 100, y + 100)
		expect(editor.getCurrentPageShapes()[0]).toMatchObject({
			x,
			y: -12, // 24 is the height of the text, and it's centered at that point
		})
	})
})
