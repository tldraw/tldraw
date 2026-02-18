import { createShapeId } from '@tldraw/editor'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('converts correctly', () => {
	editor.zoomToFit()
	expect({ ...editor.getCamera(), id: 'static' }).toMatchSnapshot('Zoom to Fit Camera')
})

it('does not zoom to bounds when camera is frozen', () => {
	const cameraBefore = { ...editor.getCamera() }
	editor.setCameraOptions({ isLocked: true })
	editor.zoomToFit()
	expect(editor.getCamera()).toMatchObject(cameraBefore)
})

it('is ignored by undo/redo', () => {
	editor.markHistoryStoppingPoint()
	editor.zoomToFit()
	const camera = editor.getCamera()
	editor.undo()
	expect(editor.getCamera()).toBe(camera)
})

it('ignores hidden shapes', () => {
	// Create a new editor with getShapeVisibility
	const editorWithHidden = new TestEditor({
		getShapeVisibility: (shape) => {
			return shape.meta.hidden ? 'hidden' : 'inherit'
		},
	})

	// Create three shapes: two visible and one hidden
	const visibleShape1 = createShapeId('visible1')
	const hiddenShape = createShapeId('hidden')
	const visibleShape2 = createShapeId('visible2')

	editorWithHidden.createShapes([
		{
			id: visibleShape1,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 100 },
		},
		{
			id: hiddenShape,
			type: 'geo',
			x: 1000,
			y: 1000,
			props: { w: 100, h: 100 },
			meta: { hidden: true },
		},
		{
			id: visibleShape2,
			type: 'geo',
			x: 200,
			y: 200,
			props: { w: 100, h: 100 },
		},
	])

	// Verify the hidden shape is actually hidden
	expect(editorWithHidden.isShapeHidden(hiddenShape)).toBe(true)
	expect(editorWithHidden.isShapeHidden(visibleShape1)).toBe(false)
	expect(editorWithHidden.isShapeHidden(visibleShape2)).toBe(false)

	// Zoom to fit should only consider visible shapes
	editorWithHidden.zoomToFit()

	// Get the current page bounds - it should only include visible shapes
	const pageBounds = editorWithHidden.getCurrentPageBounds()
	expect(pageBounds).toBeDefined()

	// The bounds should not include the hidden shape at (1000, 1000)
	// It should only include shapes at (0, 0) and (200, 200)
	expect(pageBounds!.maxX).toBeLessThan(1000)
	expect(pageBounds!.maxY).toBeLessThan(1000)
})
