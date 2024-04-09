import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.setScreenBounds({ x: 0, y: 0, w: 1800, h: 900 })
	editor.renderingBoundsMargin = 100
})

function createShapes() {
	return editor.createShapesFromJsx([
		<TL.geo ref="A" x={100} y={100} w={100} h={100} />,
		<TL.frame ref="B" x={200} y={200} w={300} h={300}>
			<TL.geo ref="C" x={200} y={200} w={50} h={50} />
			{/* this is outside of the frames clipping bounds, so it should never be rendered */}
			<TL.geo ref="D" x={1000} y={1000} w={50} h={50} />
		</TL.frame>,
	])
}

it('lists shapes in viewport', () => {
	const ids = createShapes()
	editor.selectNone()
	// D is clipped and so should always be culled / outside of viewport
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.D]))

	// Move the camera 201 pixels to the right and 201 pixels down
	editor.pan({ x: -201, y: -201 })
	jest.advanceTimersByTime(500)

	// A is now outside of the viewport
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.D]))

	editor.pan({ x: -900, y: -900 })
	jest.advanceTimersByTime(500)
	// Now all shapes are outside of the viewport
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.B, ids.C, ids.D]))

	editor.select(ids.B)
	// We don't cull selected shapes
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.C, ids.D]))

	editor.setEditingShape(ids.C)
	// or shapes being edited
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.D]))
})
