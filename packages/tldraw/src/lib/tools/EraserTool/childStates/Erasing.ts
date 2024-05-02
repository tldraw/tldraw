import {
	HIT_TEST_MARGIN,
	StateNode,
	TLEventHandlers,
	TLFrameShape,
	TLGroupShape,
	TLPointerEventInfo,
	TLShapeId,
	pointInPolygon,
} from '@tldraw/editor'

export class Erasing extends StateNode {
	static override id = 'erasing'

	private info = {} as TLPointerEventInfo
	private scribbleId = 'id'
	private markId = ''
	private excludedShapeIds = new Set<TLShapeId>()

	override onEnter = (info: TLPointerEventInfo) => {
		this.markId = 'erase scribble begin'
		this.editor.mark(this.markId)
		this.info = info

		const { originPagePoint } = this.editor.inputs
		this.excludedShapeIds = new Set(
			this.editor
				.getCurrentPageShapes()
				.filter((shape) => {
					//If the shape is locked, we shouldn't erase it
					if (this.editor.isShapeOrAncestorLocked(shape)) return true
					//If the shape is a group or frame, check we're inside it when we start erasing
					if (
						this.editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
						this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')
					) {
						const pointInShapeShape = this.editor.getPointInShapeSpace(shape, originPagePoint)
						const geometry = this.editor.getShapeGeometry(shape)
						return geometry.bounds.containsPoint(pointInShapeShape)
					}

					return false
				})
				.map((shape) => shape.id)
		)

		const scribble = this.editor.scribbles.addScribble({
			color: 'muted-1',
			size: 12,
		})
		this.scribbleId = scribble.id

		this.update()
	}

	private pushPointToScribble = () => {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.editor.scribbles.addPoint(this.scribbleId, x, y)
	}

	override onExit = () => {
		this.editor.scribbles.stop(this.scribbleId)
	}

	override onPointerMove = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	update() {
		const erasingShapeIds = this.editor.getErasingShapeIds()
		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapes = this.editor.getCurrentPageShapes()
		const {
			inputs: { currentPagePoint, previousPagePoint },
		} = this.editor

		const { excludedShapeIds } = this

		this.pushPointToScribble()

		const erasing = new Set<TLShapeId>(erasingShapeIds)

		for (const shape of currentPageShapes) {
			if (this.editor.isShapeOfType<TLGroupShape>(shape, 'group')) continue

			// Avoid testing masked shapes, unless the pointer is inside the mask
			const pageMask = this.editor.getShapeMask(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}

			// Hit test the shape using a line segment
			const geometry = this.editor.getShapeGeometry(shape)
			const A = this.editor.getPointInShapeSpace(shape, previousPagePoint)
			const B = this.editor.getPointInShapeSpace(shape, currentPagePoint)

			if (geometry.hitTestLineSegment(A, B, HIT_TEST_MARGIN / zoomLevel)) {
				erasing.add(this.editor.getOutermostSelectableShape(shape).id)
			}
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		this.editor.setErasingShapes([...erasing].filter((id) => !excludedShapeIds.has(id)))
	}

	complete() {
		this.editor.deleteShapes(this.editor.getCurrentPageState().erasingShapeIds)
		this.editor.setErasingShapes([])
		this.parent.transition('idle')
	}

	cancel() {
		this.editor.setErasingShapes([])
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}
