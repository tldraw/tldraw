import {
	Box2d,
	Matrix2d,
	pointInPolygon,
	polygonsIntersect,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import { TLPageId, TLShape, TLShapeId } from '@tldraw/tlschema'
import { TLShapeUtil } from '../../../shapeutils/TLShapeUtil'
import {
	TLCancelEvent,
	TLEventHandlers,
	TLInterruptEvent,
	TLKeyboardEvent,
	TLPointerEventInfo,
} from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Brushing extends StateNode {
	static override id = 'brushing'

	info = {} as TLPointerEventInfo & { target: 'canvas' }

	brush = new Box2d()
	initialSelectedIds: TLShapeId[] = []

	// The shape that the brush started on
	initialStartShape: TLShape | null = null

	onEnter = (info: TLPointerEventInfo & { target: 'canvas' }) => {
		const { altKey, currentPagePoint } = this.app.inputs

		if (altKey) {
			this.parent.transition('scribble_brushing', info)
			return
		}

		this.info = info
		this.initialSelectedIds = this.app.selectedIds.slice()
		this.initialStartShape = this.app.getShapesAtPoint(currentPagePoint)[0]
		this.onPointerMove()
	}

	onExit = () => {
		this.initialSelectedIds = []
		this.app.setBrush(null)
	}

	onPointerMove = () => {
		this.hitTestShapes()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel?: TLCancelEvent | undefined = (info) => {
		this.app.setSelectedIds(this.initialSelectedIds, true)
		this.parent.transition('idle', info)
	}

	onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		if (this.app.inputs.altKey) {
			this.parent.transition('scribble_brushing', info)
		} else {
			this.hitTestShapes()
		}
	}

	onKeyUp?: TLKeyboardEvent | undefined = () => {
		this.hitTestShapes()
	}

	private complete() {
		this.parent.transition('idle', {})
	}

	private hitTestShapes() {
		const {
			currentPageId,
			shapesArray,
			inputs: { originPagePoint, currentPagePoint, shiftKey, ctrlKey },
		} = this.app

		// Set the brush to contain the current and origin points
		this.brush.setTo(Box2d.FromPoints([originPagePoint, currentPagePoint]))

		// We'll be collecting shape ids
		const results = new Set(shiftKey ? this.initialSelectedIds : [])

		let A: VecLike,
			B: VecLike,
			shape: TLShape,
			util: TLShapeUtil<TLShape>,
			pageBounds: Box2d | undefined,
			pageTransform: Matrix2d | undefined,
			localCorners: VecLike[]

		// We'll be testing the corners of the brush against the shapes
		const { corners } = this.brush

		testAllShapes: for (let i = 0, n = shapesArray.length; i < n; i++) {
			shape = shapesArray[i]

			// don't select groups directly, only via their children
			if (shape.type === 'group') continue testAllShapes

			if (results.has(shape.id)) continue testAllShapes

			if (this.app.isShapeOrParentLocked(shape)) continue testAllShapes

			pageBounds = this.app.getPageBounds(shape)
			if (!pageBounds) continue testAllShapes

			// If the brush fully wraps a shape, it's almost certainly a hit
			if (this.brush.contains(pageBounds)) {
				this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
				continue testAllShapes
			}

			// Should we even test for a single segment intersections? Only if
			// we're not holding the ctrl key for alternate selection mode
			// (only wraps count!), or if the shape is a frame.
			if (ctrlKey || shape.type === 'frame') {
				continue testAllShapes
			}

			// If the brush collides the page bounds, then do hit tests against
			// each of the brush's four sides.
			if (this.brush.collides(pageBounds)) {
				// Shapes expect to hit test line segments in their own coordinate system,
				// so we first need to get the brush corners in the shape's local space.
				util = this.app.getShapeUtil(shape)

				pageTransform = this.app.getPageTransform(shape)

				if (!pageTransform) {
					continue testAllShapes
				}

				// Check whether any of the the brush edges intersect the shape
				localCorners = Matrix2d.applyToPoints(Matrix2d.Inverse(pageTransform), corners)

				hitTestBrushEdges: for (let i = 0; i < localCorners.length; i++) {
					A = localCorners[i]
					B = localCorners[(i + 1) % localCorners.length]

					if (util.hitTestLineSegment(shape, A, B)) {
						this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
						break hitTestBrushEdges
					}
				}
			}
		}

		this.app.setBrush({ ...this.brush.toJson() })
		this.app.setSelectedIds(Array.from(results), true)
	}

	onInterrupt: TLInterruptEvent = () => {
		this.app.setBrush(null)
	}

	private handleHit(
		shape: TLShape,
		currentPagePoint: Vec2d,
		currentPageId: TLPageId,
		results: Set<TLShapeId>,
		corners: Vec2d[]
	) {
		if (shape.parentId === currentPageId) {
			results.add(shape.id)
			return
		}

		// Find the outermost selectable shape, check to see if it has a
		// page mask; and if so, check to see if the brush intersects it
		const selectedShape = this.app.getOutermostSelectableShape(shape)
		const pageMask = this.app.getPageMaskById(selectedShape.id)

		if (
			pageMask &&
			polygonsIntersect(pageMask, corners) !== null &&
			!pointInPolygon(currentPagePoint, pageMask)
		) {
			return
		}

		results.add(selectedShape.id)
	}
}
