import { TLArrowShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

export declare function assertNever(x: never): never

it('narrows down the shape type', () => {
	const id = createShapeId('arrow1')
	editor.createShape({ type: 'arrow', id, x: 0, y: 0 })

	const shape = editor.getShape(id)!
	if (editor.isShapeOfType(shape, 'arrow')) {
		expect(shape.type === 'arrow').toBe(true)
		expect(
			// @ts-expect-error This comparison appears to be unintentional because the types '"arrow"' and '"card"' have no overlap.
			shape.type === 'card'
		).toBe(false)
	}
})

it('narrows down the shape type with generic', () => {
	const id = createShapeId('arrow1')
	editor.createShape({ type: 'arrow', id, x: 0, y: 0 })

	const shape = editor.getShape(id)!
	if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
		expect(shape.type === 'arrow').toBe(true)

		expect(
			// @ts-expect-error This comparison appears to be unintentional because the types '"arrow"' and '"card"' have no overlap.
			shape.type === 'card'
		).toBe(false)
	}

	// @ts-expect-error mismatch between the generic and the shape type
	if (editor.isShapeOfType<TLArrowShape>(shape, 'card')) {
		assertNever(shape)
	}
})
