import { PI, TLShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'
import { TL } from '../test-jsx'

let editor: TestEditor
let ids: Record<string, TLShapeId>

jest.useFakeTimers()

function createVideoShape() {
	return editor.createShapesFromJsx(<TL.video ref="video1" x={0} y={0} w={160} h={90} />).video1
}

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll()
	editor.deleteShapes(editor.getSelectedShapeIds())
	ids = editor.createShapesFromJsx([
		<TL.geo ref="boxA" x={0} y={0} w={100} h={100} />,
		<TL.geo ref="boxB" x={100} y={100} w={50} h={50} />,
		<TL.geo ref="boxC" x={400} y={400} w={100} h={100} />,
	])
	editor.selectAll()
})

describe('when less than two shapes are selected', () => {
	it('does nothing', () => {
		editor.setSelectedShapes([ids.boxB])
		const fn = jest.fn()
		editor.on('change-history', fn)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		jest.advanceTimersByTime(1000)

		expect(fn).not.toHaveBeenCalled()
	})
})

describe('when multiple shapes are selected', () => {
	it('stretches horizontally', () => {
		editor.selectAll()
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		jest.advanceTimersByTime(1000)
		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { w: 500 } },
			{ id: ids.boxB, x: 0, y: 100, props: { w: 500 } },
			{ id: ids.boxC, x: 0, y: 400, props: { w: 500 } }
		)
	})

	it('stretches horizontally and preserves aspect ratio', () => {
		const videoA = createVideoShape()
		editor.selectAll()
		expect(editor.getSelectedShapes().length).toBe(4)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		jest.advanceTimersByTime(1000)
		const newHeight = (500 * 9) / 16
		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { w: 500 } },
			{ id: ids.boxB, x: 0, y: 100, props: { w: 500 } },
			{ id: ids.boxC, x: 0, y: 400, props: { w: 500 } },
			{ id: videoA, x: 0, y: -95.625, props: { w: 500, h: newHeight } }
		)
	})

	it('stretches vertically', () => {
		editor.selectAll()
		editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
		jest.advanceTimersByTime(1000)
		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { h: 500 } },
			{ id: ids.boxB, x: 100, y: 0, props: { h: 500 } },
			{ id: ids.boxC, x: 400, y: 0, props: { h: 500 } }
		)
	})

	it('stretches vertically and preserves aspect ratio', () => {
		const videoA = createVideoShape()
		editor.selectAll()
		expect(editor.getSelectedShapes().length).toBe(4)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
		jest.advanceTimersByTime(1000)
		const newWidth = (500 * 16) / 9
		editor.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { h: 500 } },
			{ id: ids.boxB, x: 100, y: 0, props: { h: 500 } },
			{ id: ids.boxC, x: 400, y: 0, props: { h: 500 } },
			{ id: videoA, x: -364.44444444444446, y: 0, props: { w: newWidth, h: 500 } }
		)
	})

	it('does, undoes and redoes command', () => {
		editor.mark('stretch')
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		jest.advanceTimersByTime(1000)

		editor.expectShapeToMatch({ id: ids.boxB, x: 0, props: { w: 500 } })
		editor.undo()
		editor.expectShapeToMatch({ id: ids.boxB, x: 100, props: { w: 50 } })
		editor.redo()
		editor.expectShapeToMatch({ id: ids.boxB, x: 0, props: { w: 500 } })
	})
})

describe('When shapes are the child of another shape.', () => {
	it('stretches horizontally', () => {
		editor.reparentShapes([ids.boxB], ids.boxA)
		editor.select(ids.boxB, ids.boxC)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		jest.advanceTimersByTime(1000)
		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100, y: 100, props: { w: 400 } },
			{ id: ids.boxC, x: 100, y: 400, props: { w: 400 } }
		)
	})

	it('stretches vertically', () => {
		editor.reparentShapes([ids.boxB], ids.boxA)
		editor.select(ids.boxB, ids.boxC)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
		jest.advanceTimersByTime(1000)
		editor.expectShapeToMatch(
			{ id: ids.boxB, x: 100, y: 100, props: { h: 400 } },
			{ id: ids.boxC, x: 400, y: 100, props: { h: 400 } }
		)
	})
})

describe('When shapes are the child of a rotated shape.', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())
		ids = editor.createShapesFromJsx([
			<TL.geo ref="boxA" x={0} y={0} w={100} h={100} rotation={PI}>
				<TL.geo ref="boxB" x={100} y={100} w={50} h={50} />
			</TL.geo>,
			<TL.geo ref="boxC" x={200} y={200} w={100} h={100} />,
		])
		editor.selectAll()
	})

	it('does not stretches rotated shapes', () => {
		editor.select(ids.boxB, ids.boxC)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		jest.advanceTimersByTime(1000)
		editor.expectShapeToMatch(
			{
				id: ids.boxB,
				x: 100,
				y: 100,
				props: {
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				x: -150,
				y: 200,
				props: {
					w: 450,
					h: 100,
				},
			}
		)
	})

	it('does not stretches rotated shapes', () => {
		editor.select(ids.boxB, ids.boxC)
		editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
		jest.advanceTimersByTime(1000)
		editor.expectShapeToMatch(
			{
				id: ids.boxB,
				x: 100,
				y: 100,
				props: {
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				x: 200,
				y: -150,
				props: {
					w: 100,
					h: 450,
				},
			}
		)
	})
})

describe('When shapes have 0-width or 0-height', () => {
	it('Does not error with 0-width', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())

		editor
			.setCurrentTool('arrow')
			.keyDown('shift')
			.pointerDown(50, 0)
			.pointerMove(50, 100)
			.pointerUp(50, 100)
			.keyUp('shift')

			.setCurrentTool('geo')
			.pointerDown(0, 0)
			.pointerMove(100, 100)
			.pointerUp(100, 100)

		editor.selectAll()

		// make sure we don't get any errors:
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
	})

	it('Does not error with 0-height', () => {
		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapeIds())

		editor
			// draw a perfectly horiztonal arrow:
			.setCurrentTool('arrow')
			.keyDown('shift')
			.pointerDown(0, 50)
			.pointerMove(100, 50)
			.pointerUp(100, 50)
			.keyUp('shift')

			// plus a box:
			.setCurrentTool('geo')
			.pointerDown(0, 0)
			.pointerMove(100, 100)
			.pointerUp(100, 100)

		editor.selectAll()

		// make sure we don't get any errors:
		editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
		editor.stretchShapes(editor.getSelectedShapeIds(), 'vertical')
	})
})
