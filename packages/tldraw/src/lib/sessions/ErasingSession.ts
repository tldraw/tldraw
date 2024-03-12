import {
	HIT_TEST_MARGIN,
	Session,
	TLFrameShape,
	TLGroupShape,
	TLShapeId,
	pointInPolygon,
} from '@tldraw/editor'

export class ErasingSession extends Session {
	readonly id = 'erasing'

	didErase = false

	excludedShapeIds = new Set<string>()

	scribbleId = ''

	override onStart() {
		const { editor, excludedShapeIds } = this
		const { originPagePoint } = editor.inputs

		editor.setCursor({ type: 'cross', rotation: 0 })

		editor
			.getCurrentPageShapes()
			.filter((shape) => {
				//If the shape is locked, we shouldn't erase it
				if (editor.isShapeOrAncestorLocked(shape)) return true
				//If the shape is a group or frame, check we're inside it when we start erasing
				if (
					editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
					editor.isShapeOfType<TLFrameShape>(shape, 'frame')
				) {
					const pointInShapeShape = editor.getPointInShapeSpace(shape, originPagePoint)
					const geometry = editor.getShapeGeometry(shape)
					return geometry.bounds.containsPoint(pointInShapeShape)
				}
			})
			.forEach((shape) => excludedShapeIds.add(shape.id))

		const scribble = editor.scribbles.addScribble({
			color: 'muted-1',
			size: 12,
		})
		this.scribbleId = scribble.id
	}

	override onUpdate() {
		const { editor } = this

		// If the user has stopped pointing, we're done
		if (!editor.inputs.isPointing) {
			this.complete()
			return
		}

		if (!this.didErase) {
			// If the user has stopped dragging, we're done
			if (!editor.inputs.isDragging) {
				this.complete()
				return
			}

			// mark when we start dragging
			editor.mark(this.id)
			this.didErase = true
		}

		const erasingShapeIds = editor.getErasingShapeIds()
		const zoomLevel = editor.getZoomLevel()
		const currentPageShapes = editor.getCurrentPageShapes()
		const {
			inputs: { currentPagePoint, previousPagePoint },
		} = editor

		const { excludedShapeIds } = this

		const { x, y } = editor.inputs.currentPagePoint
		editor.scribbles.addPoint(this.scribbleId, x, y)

		const erasing = new Set<TLShapeId>(erasingShapeIds)

		for (const shape of currentPageShapes) {
			if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) continue

			// Avoid testing masked shapes, unless the pointer is inside the mask
			const pageMask = editor.getShapeMask(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}

			// Hit test the shape using a line segment
			const geometry = editor.getShapeGeometry(shape)
			const A = editor.getPointInShapeSpace(shape, previousPagePoint)
			const B = editor.getPointInShapeSpace(shape, currentPagePoint)

			if (geometry.hitTestLineSegment(A, B, HIT_TEST_MARGIN / zoomLevel)) {
				erasing.add(editor.getOutermostSelectableShape(shape).id)
			}
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		editor.setErasingShapes([...erasing].filter((id) => !excludedShapeIds.has(id)))
	}

	override onComplete() {
		const { editor } = this
		editor.deleteShapes(editor.getCurrentPageState().erasingShapeIds)
	}

	override onCancel() {
		const { editor } = this
		editor.bailToMark(this.id)
	}

	override onEnd() {
		const { editor } = this
		editor.setErasingShapes([])
		editor.scribbles.stop(this.scribbleId)
	}
}
