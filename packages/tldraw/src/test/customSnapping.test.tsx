import {
	BaseBoxShapeUtil,
	IndexKey,
	Polyline2d,
	TLAnyShapeUtilConstructor,
	TLBaseShape,
	TLLineShape,
	TLShapeId,
	Vec,
	VecModel,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

describe('custom shape bounds snapping - translate', () => {
	type TestShape = TLBaseShape<
		'test',
		{ w: number; h: number; boundsSnapPoints: VecModel[] | null }
	>
	class TestShapeUtil extends BaseBoxShapeUtil<TestShape> {
		static override type = 'test'
		override getDefaultProps() {
			return { w: 100, h: 100, boundsSnapPoints: null }
		}
		override component() {
			throw new Error('Method not implemented.')
		}
		override indicator() {
			throw new Error('Method not implemented.')
		}
		override getBoundsSnapGeometry(shape: TestShape) {
			return {
				points: shape.props.boundsSnapPoints ?? undefined,
			}
		}
	}
	const shapeUtils = [TestShapeUtil] as TLAnyShapeUtilConstructor[]

	let editor: TestEditor
	let ids: Record<string, TLShapeId>
	beforeEach(() => {
		editor = new TestEditor({ shapeUtils })
		ids = editor.createShapesFromJsx([
			<TL.geo ref="box" x={0} y={0} w={100} h={100} />,
			<TL.test ref="test" x={200} y={200} w={100} h={100} boundsSnapPoints={null} />,
		])
	})

	describe('with default boundSnapPoints', () => {
		test('normal snapping works with default boundSnapPoints when moving test shape', () => {
			// start translating the test shape
			editor.setSelectedShapes([ids.test]).pointerDown(250, 250)

			// move the left edge of the test shape to the right edge of the box shape - it should snap
			editor.pointerMove(155, 250, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(editor.getOnlySelectedShape()?.x).toBe(100)

			// move the left edge of the test shape to the center of the box shape - it should snap
			editor.pointerMove(105, 250, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(2)
			expect(editor.getOnlySelectedShape()?.x).toBe(50)
		})

		test('normal snapping works with default boundSnapPoints when snapping to test shape', () => {
			// start translating the box shape
			editor.setSelectedShapes([ids.box]).pointerDown(50, 50)

			// move the left edge of the box shape to the right edge of the test shape - it should snap
			editor.pointerMove(155, 50, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(editor.getOnlySelectedShape()?.x).toBe(100)

			// move the left edge of the box shape to the center of the test shape - it should snap
			editor.pointerMove(205, 50, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(2)
			expect(editor.getOnlySelectedShape()?.x).toBe(150)
		})
	})

	describe('with only the center in boundSnapPoints', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: { boundsSnapPoints: [{ x: 50, y: 50 }] },
			})
		})

		describe('when moving the test shape', () => {
			beforeEach(() => editor.select(ids.test).pointerDown(250, 250))

			test('does not snap its edges to the box edges', () => {
				editor.pointerMove(155, 250, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(0)
				expect(editor.getOnlySelectedShape()?.x).toBe(105)
			})

			test('snaps its center to the box right edge', () => {
				editor.pointerMove(105, 250, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(1)
				expect(editor.getOnlySelectedShape()?.x).toBe(50)
			})
		})

		describe('when moving the box shape', () => {
			beforeEach(() => editor.select(ids.box).pointerDown(50, 50))

			test('does not snap to the left edge of the test shape', () => {
				editor.pointerMove(155, 50, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(0)
				expect(editor.getOnlySelectedShape()?.x).toBe(105)
			})

			test('snaps its right edge to the center of the test shape', () => {
				editor.pointerMove(205, 50, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(1)
				expect(editor.getOnlySelectedShape()?.x).toBe(150)
			})
		})
	})

	describe('with empty boundSnapPoints', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: { boundsSnapPoints: [] },
			})
		})

		test('test shape does not snap to anything', () => {
			editor.select(ids.test).pointerDown(250, 250)

			// try to snap our left edge to the right edge of the box shape - it should not snap
			editor.pointerMove(155, 250, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(editor.getOnlySelectedShape()?.x).toBe(105)

			// try to snap our left edge to the center of the box shape - it should not snap
			editor.pointerMove(105, 250, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(editor.getOnlySelectedShape()?.x).toBe(55)
		})

		test('box shape does not snap to test shape', () => {
			editor.select(ids.box).pointerDown(50, 50)

			// try to snap our left edge to the right edge of the test shape - it should not snap
			editor.pointerMove(155, 50, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(editor.getOnlySelectedShape()?.x).toBe(105)

			// try to snap our right edge to the center of the test shape - it should not snap
			editor.pointerMove(205, 50, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(editor.getOnlySelectedShape()?.x).toBe(155)
		})
	})
})

describe('custom handle snapping', () => {
	type TestShape = TLBaseShape<
		'test',
		{ w: number; h: number; handleGeomVertices: VecModel[] | 'default' | null }
	>
	class TestShapeUtil extends BaseBoxShapeUtil<TestShape> {
		static override type = 'test'
		override getDefaultProps(): TestShape['props'] {
			return { w: 100, h: 100, handleGeomVertices: 'default' }
		}
		override component() {
			throw new Error('Method not implemented.')
		}
		override indicator() {
			throw new Error('Method not implemented.')
		}
		override getHandleSnapGeometry(shape: TestShape) {
			const vertices = shape.props.handleGeomVertices
			return {
				outline:
					vertices === 'default'
						? undefined
						: vertices === null
							? null
							: new Polyline2d({ points: vertices.map(Vec.From) }),
			}
		}
	}
	const shapeUtils = [TestShapeUtil] as TLAnyShapeUtilConstructor[]

	let editor: TestEditor
	let ids: Record<string, TLShapeId>
	beforeEach(() => {
		editor = new TestEditor({ shapeUtils })
		ids = editor.createShapesFromJsx([
			<TL.line
				ref="line"
				x={0}
				y={0}
				handles={{
					['a1' as IndexKey]: { x: 0, y: 0 },
					['a2' as IndexKey]: { x: 100, y: 100 },
				}}
			/>,
			<TL.test ref="test" x={200} y={200} w={100} h={100} boundsSnapPoints={null} />,
		])
	})

	function startDraggingHandle() {
		const shape = editor.select(ids.line).getOnlySelectedShape()! as TLLineShape
		const handles = editor.getShapeHandles(shape)!
		editor.pointerDown(100, 100, { target: 'handle', shape, handle: handles[handles.length - 1] })
	}

	function handlePosition() {
		const shape = editor.select(ids.line).getOnlySelectedShape()! as TLLineShape
		const handles = editor.getShapeHandles(shape)!
		const handle = handles[handles.length - 1]
		return { x: handle.x, y: handle.y }
	}

	describe('with default handleGeomVertices', () => {
		test('snaps handles to the box of the shape', () => {
			startDraggingHandle()
			editor.pointerMove(215, 205, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition().x).toBe(215)
			expect(handlePosition().y).toBe(200)
		})

		test("doesn't particularly snap to vertices", () => {
			startDraggingHandle()
			editor.pointerMove(204, 205, undefined, { ctrlKey: true })
			// only snapped to the nearest edge, not the vertex
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition().x).toBe(200)
			expect(handlePosition().y).toBe(205)
		})

		test("doesn't snap to the center", () => {
			startDraggingHandle()
			editor.pointerMove(251, 251, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(handlePosition().x).toBe(251)
			expect(handlePosition().y).toBe(251)
		})
	})

	describe('with empty handleGeomVertices', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: { handleGeomVertices: null },
			})
		})

		test("doesn't snap to the shape at all", () => {
			startDraggingHandle()
			editor.pointerMove(215, 205, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(handlePosition().x).toBe(215)
			expect(handlePosition().y).toBe(205)
		})
	})

	describe('with custom handleGeomVertices', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: {
					// a diagonal line from the top left to the bottom right
					handleGeomVertices: [
						{ x: 0, y: 0 },
						{ x: 100, y: 100 },
					],
				},
			})
		})

		test('does not snap to the normal edges of the shape', () => {
			startDraggingHandle()
			editor.pointerMove(235, 205, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(handlePosition().x).toBe(235)
			expect(handlePosition().y).toBe(205)
		})

		test('snaps to the custom geometry', () => {
			startDraggingHandle()
			editor.pointerMove(210, 214, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition().x).toBe(212)
			expect(handlePosition().y).toBe(212)
		})
	})
})
