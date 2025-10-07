import {
	BaseBoxShapeUtil,
	IndexKey,
	Polyline2d,
	TLAnyShapeUtilConstructor,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
	TLLineShape,
	TLShapeId,
	Vec,
	VecModel,
	ZERO_INDEX_KEY,
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
		{
			w: number
			h: number
			ownHandle: VecModel
			handleOutline: VecModel[] | 'default' | null
			handlePoints: VecModel[] | 'default'
			selfSnapOutline: VecModel[] | 'default'
			selfSnapPoints: VecModel[] | 'default'
			handleSnapType?: 'point' | 'align'
		}
	>
	class TestShapeUtil extends BaseBoxShapeUtil<TestShape> {
		static override type = 'test'
		override getDefaultProps(): TestShape['props'] {
			return {
				w: 100,
				h: 100,
				ownHandle: { x: 0, y: 0 },
				handleOutline: 'default',
				handlePoints: 'default',
				selfSnapOutline: 'default',
				selfSnapPoints: 'default',
			}
		}
		override component() {
			throw new Error('Method not implemented.')
		}
		override indicator() {
			throw new Error('Method not implemented.')
		}
		override getHandleSnapGeometry(shape: TestShape) {
			const { handleOutline, handlePoints, selfSnapOutline, selfSnapPoints } = shape.props
			return {
				outline:
					handleOutline === 'default'
						? undefined
						: handleOutline === null
							? null
							: new Polyline2d({ points: handleOutline.map(Vec.From) }),
				points: handlePoints === 'default' ? undefined : handlePoints,

				getSelfSnapOutline:
					selfSnapOutline === 'default'
						? undefined
						: () => new Polyline2d({ points: selfSnapOutline.map(Vec.From) }),
				getSelfSnapPoints: selfSnapPoints === 'default' ? undefined : () => selfSnapPoints,
			}
		}
		override getHandles(shape: TestShape): TLHandle[] {
			const handle: TLHandle = {
				id: 'handle',
				label: 'handle',
				type: 'vertex',
				x: shape.props.ownHandle.x,
				y: shape.props.ownHandle.y,
				index: ZERO_INDEX_KEY,
			}

			if (shape.props.handleSnapType) {
				handle.snapType = shape.props.handleSnapType
			} else {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				handle.canSnap = true
			}

			return [handle]
		}
		override onHandleDrag(shape: TestShape, { handle }: TLHandleDragInfo<TestShape>) {
			return { ...shape, props: { ...shape.props, ownHandle: { x: handle.x, y: handle.y } } }
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
				points={{
					a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
					a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 100 },
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

	describe('with default handleSnapGeometry.outline', () => {
		test('snaps handles to the box of the shape', () => {
			startDraggingHandle()
			editor.pointerMove(215, 205, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 215, y: 200 })
		})

		test("doesn't particularly snap to vertices", () => {
			startDraggingHandle()
			editor.pointerMove(204, 205, undefined, { ctrlKey: true })
			// only snapped to the nearest edge, not the vertex
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 200, y: 205 })
		})

		test("doesn't snap to the center", () => {
			startDraggingHandle()
			editor.pointerMove(251, 251, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(handlePosition()).toMatchObject({ x: 251, y: 251 })
		})
	})

	describe('with empty handleSnapGeometry.outline', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: { handleOutline: null },
			})
		})

		test("doesn't snap to the shape at all", () => {
			startDraggingHandle()
			editor.pointerMove(215, 205, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(handlePosition()).toMatchObject({ x: 215, y: 205 })
		})
	})

	describe('with custom handleSnapGeometry.outline', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: {
					// a diagonal line from the top left to the bottom right
					handleOutline: [
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
			expect(handlePosition()).toMatchObject({ x: 235, y: 205 })
		})

		test('snaps to the custom geometry', () => {
			startDraggingHandle()
			editor.pointerMove(210, 214, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 212, y: 212 })
		})
	})

	describe('with default handleSnapGeometry.points', () => {
		test('doesnt snap to the center', () => {
			startDraggingHandle()
			editor.pointerMove(251, 251, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(0)
			expect(handlePosition()).toMatchObject({ x: 251, y: 251 })
		})

		test('doesnt snap to corners', () => {
			startDraggingHandle()
			editor.pointerMove(203, 202, undefined, { ctrlKey: true })
			// snaps to edge, not corner:
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 203, y: 200 })
		})
	})

	describe('with custom handleSnapGeometry.points', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: {
					handlePoints: [
						{ x: 30, y: 30 },
						{ x: 70, y: 50 },
					],
				},
			})
		})

		test('snaps to the custom points', () => {
			startDraggingHandle()
			editor.pointerMove(235, 235, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 230, y: 230 })

			editor.snaps.clearIndicators()
			editor.pointerMove(265, 255, undefined, { ctrlKey: true })
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 270, y: 250 })
		})
	})

	describe('with custom handleSnapGeometry.points along the outline', () => {
		beforeEach(() => {
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				props: {
					handlePoints: editor
						.getShapeGeometry(ids.test)
						.bounds.cornersAndCenter.map(({ x, y }) => ({ x, y })),
				},
			})
		})

		test('snaps to points over outline', () => {
			startDraggingHandle()
			editor.pointerMove(203, 202, undefined, { ctrlKey: true })
			// snaps to corner, not edge:
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 200, y: 200 })
		})

		test('can still snap to non-outline points', () => {
			startDraggingHandle()
			editor.pointerMove(255, 255, undefined, { ctrlKey: true })
			// snaps to the center:
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 250, y: 250 })
		})

		test('can still snap to non-point outlines', () => {
			startDraggingHandle()
			editor.pointerMove(235, 205, undefined, { ctrlKey: true })
			// snaps to the edge:
			expect(editor.snaps.getIndicators()).toHaveLength(1)
			expect(handlePosition()).toMatchObject({ x: 235, y: 200 })
		})
	})

	describe('self snapping', () => {
		beforeEach(() => {
			editor.deleteShape(ids.line)
			editor.updateShape<TestShape>({
				id: ids.test,
				type: 'test',
				x: 0,
				y: 0,
				props: {
					handlePoints: [{ x: 0, y: 0 }],
				},
			})
		})
		function startDraggingOwnHandle() {
			const shape = editor.select(ids.test).getOnlySelectedShape()!
			const handles = editor.getShapeHandles(shape)!
			editor.pointerDown(0, 0, { target: 'handle', shape, handle: handles[0] })
		}
		function ownHandlePosition() {
			const shape = editor.select(ids.test).getOnlySelectedShape()!
			const handle = editor.getShapeHandles(shape)![0]
			return { x: handle.x, y: handle.y }
		}
		describe('by default', () => {
			test('does not snap to standard outline', () => {
				startDraggingOwnHandle()
				editor.pointerMove(3, 50, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(0)
				expect(ownHandlePosition()).toMatchObject({ x: 3, y: 50 })
			})
			test('does not snap to standard points', () => {
				startDraggingOwnHandle()
				editor.pointerMove(3, 3, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(0)
				expect(ownHandlePosition()).toMatchObject({ x: 3, y: 3 })
			})
		})
		describe('with custom self snap outline & points', () => {
			beforeEach(() => {
				editor.updateShape<TestShape>({
					id: ids.test,
					type: 'test',
					props: {
						selfSnapOutline: [
							{ x: 20, y: 50 },
							{ x: 80, y: 50 },
						],
						selfSnapPoints: [
							{ x: 20, y: 50 },
							{ x: 80, y: 50 },
						],
					},
				})
			})

			test('does not snap to standard outline', () => {
				startDraggingOwnHandle()
				editor.pointerMove(3, 50, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(0)
				expect(ownHandlePosition()).toMatchObject({ x: 3, y: 50 })
			})
			test('does not snap to standard points', () => {
				startDraggingOwnHandle()
				editor.pointerMove(3, 3, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(0)
				expect(ownHandlePosition()).toMatchObject({ x: 3, y: 3 })
			})
			test('snaps to the self-snap outline', () => {
				startDraggingOwnHandle()
				editor.pointerMove(50, 55, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(1)
				expect(ownHandlePosition()).toMatchObject({ x: 50, y: 50 })
			})
			test('snaps to the self-snap points', () => {
				startDraggingOwnHandle()
				editor.pointerMove(23, 55, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(1)
				expect(ownHandlePosition()).toMatchObject({ x: 20, y: 50 })
			})
		})

		describe('with snapType set to align', () => {
			beforeEach(() => {
				editor.updateShape<TestShape>({
					id: ids.test,
					type: 'test',
					props: {
						selfSnapPoints: [
							{ x: 20, y: 50 },
							{ x: 60, y: 10 },
						],
						handleSnapType: 'align',
					},
				})
			})

			test('snaps to the y axis', () => {
				startDraggingOwnHandle()
				editor.pointerMove(18, 0, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(1)
				expect(ownHandlePosition()).toMatchObject({ x: 20, y: 0 })
			})

			test('snaps to the x axis', () => {
				startDraggingOwnHandle()
				editor.pointerMove(0, 48, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(1)
				expect(ownHandlePosition()).toMatchObject({ x: 0, y: 50 })
			})

			test('snaps to both axes', () => {
				startDraggingOwnHandle()
				editor.pointerMove(18, 9, undefined, { ctrlKey: true })
				expect(editor.snaps.getIndicators()).toHaveLength(2)
				expect(ownHandlePosition()).toMatchObject({ x: 20, y: 10 })
			})
		})
	})
})
