import {
	HIT_TEST_MARGIN,
	TLEventInfo,
	TLFrameShape,
	TLGroupShape,
	TLShapeId,
	TLToolContext,
	ToolUtil,
	pointInPolygon,
} from 'tldraw'

interface SimpleEraserContext extends TLToolContext {
	readonly type: '@simple/eraser'
	state:
		| {
				name: 'idle'
		  }
		| {
				name: 'pointing'
		  }
		| {
				name: 'erasing'
				scribbleId: string
		  }
}

export class SimpleEraserToolUtil extends ToolUtil<SimpleEraserContext> {
	static override type = '@simple/eraser' as const

	getDefaultContext(): SimpleEraserContext {
		return {
			type: '@simple/eraser',
			state: { name: 'idle' },
		}
	}

	underlay() {
		return null
	}

	overlay() {
		return null
	}

	getStyles() {
		return null
	}

	onEnter() {
		const { editor } = this
		editor.setCursor({ type: 'cross', rotation: 0 })
		return
	}

	onExit() {
		return
	}

	onEvent(event: TLEventInfo) {
		const { editor } = this
		const context = this.getContext()

		if (event.name === 'cancel') {
			this.cancel()
			return
		}

		if (event.name === 'complete') {
			this.complete()
			return
		}

		switch (context.state.name) {
			case 'idle': {
				if (editor.inputs.isPointing) {
					// started pointing
					this.setContext({
						state: { name: 'pointing' },
					})
					this.startErasingPointedShapes()
				}
				break
			}
			case 'pointing': {
				if (!editor.inputs.isPointing) {
					// stopped pointing before dragging
					this.complete()
					return
				}

				if (editor.inputs.isDragging || event.name === 'long_press') {
					// started dragging
					const scribble = editor.scribbles.addScribble({
						color: 'muted-1',
						size: 12,
					})
					this.setContext({
						state: { name: 'erasing', scribbleId: scribble.id },
					})
					this.updateErasingShapes()
					return
				}

				break
			}
			case 'erasing': {
				if (!editor.inputs.isPointing) {
					// stopped pointing
					this.complete()
					return
				}

				if (event.name === 'tick') {
					this.updateErasingShapes()
				}

				break
			}
		}
	}

	/* --------------------- Private -------------------- */

	private memo = {
		scribbleId: null as string | null,
		excludedShapeIds: new Set<TLShapeId>(),
		erasingShapeIds: new Set<TLShapeId>(),
	}

	private cancel() {
		const { editor } = this

		// Reset the erasing shapes
		editor.setErasingShapes([])
		editor.bailToMark('erasing')

		// Stop the scribble
		const context = this.getContext()
		if (context.state.name === 'erasing') {
			this.editor.scribbles.stop(context.state.scribbleId)
		}

		this.setContext({ state: { name: 'idle' } })
	}

	private complete() {
		const { editor } = this

		// Delete any shapes that were marked as erasing
		const erasingShapeIds = editor.getErasingShapeIds()
		if (erasingShapeIds.length) {
			editor.deleteShapes(erasingShapeIds)
			editor.setErasingShapes([])
		}

		// Stop the scribble
		const context = this.getContext()
		if (context.state.name === 'erasing') {
			this.editor.scribbles.stop(context.state.scribbleId)
		}

		this.setContext({ state: { name: 'idle' } })
	}

	private startErasingPointedShapes() {
		const { editor, memo } = this
		const { originPagePoint } = editor.inputs

		editor.mark('erasing')

		const zoomLevel = this.editor.getZoomLevel()
		const minDist = HIT_TEST_MARGIN / zoomLevel

		// Populate the excluded shape ids and the erasing shape ids
		// working front to back...
		const shapes = editor.getCurrentPageShapesSorted()
		for (let i = shapes.length - 1; i > -1; i--) {
			const shape = shapes[i]

			// If the shape is locked, exclude it
			if (editor.isShapeOrAncestorLocked(shape)) {
				memo.excludedShapeIds.add(shape.id)
				continue
			}

			// If the shape is a group or a frame and the click began inside the shape, exclude it
			if (
				editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
				editor.isShapeOfType<TLFrameShape>(shape, 'frame')
			) {
				this.editor.isPointInShape(shape, originPagePoint, {
					hitInside: true,
					margin: 0,
				})
				memo.excludedShapeIds.add(shape.id)
				continue
			}

			// Look for hit shapes
			if (
				this.editor.isPointInShape(shape, originPagePoint, {
					hitInside: false,
					margin: minDist,
				})
			) {
				const hitShape = this.editor.getOutermostSelectableShape(shape)
				// If we've hit a frame after hitting any other shape, stop here
				if (
					this.editor.isShapeOfType<TLFrameShape>(hitShape, 'frame') &&
					memo.erasingShapeIds.size > 0
				) {
					break
				}

				memo.erasingShapeIds.add(hitShape.id)
			}
		}

		this.editor.setErasingShapes(Array.from(memo.erasingShapeIds))
	}

	private updateErasingShapes() {
		const { editor, memo } = this

		const context = this.getContext()
		if (context.state.name !== 'erasing') return

		// Erase
		const { excludedShapeIds } = memo
		const { scribbleId } = context.state

		const zoomLevel = editor.getZoomLevel()
		const erasingShapeIds = editor.getErasingShapeIds()

		const {
			inputs: { currentPagePoint, previousPagePoint },
		} = editor

		const { x, y } = currentPagePoint
		editor.scribbles.addPoint(scribbleId, x, y)

		const erasing = new Set<TLShapeId>(erasingShapeIds)
		const minDist = HIT_TEST_MARGIN / zoomLevel

		const currentPageShapes = editor.getCurrentPageShapes()
		for (const shape of currentPageShapes) {
			if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) continue

			// Avoid testing masked shapes, unless the pointer is inside the mask
			const pageMask = editor.getShapeMask(shape.id)
			if (pageMask && !pointInPolygon(currentPagePoint, pageMask)) {
				continue
			}

			// Hit test the shape using a line segment
			const geometry = editor.getShapeGeometry(shape)
			const pageTransform = editor.getShapePageTransform(shape)
			if (!geometry || !pageTransform) continue
			const pt = pageTransform.clone().invert()
			const A = pt.applyToPoint(previousPagePoint)
			const B = pt.applyToPoint(currentPagePoint)

			// If the line segment is entirely above / below / left / right of the shape's bounding box, skip the hit test
			const { bounds } = geometry
			if (
				bounds.minX - minDist > Math.max(A.x, B.x) ||
				bounds.minY - minDist > Math.max(A.y, B.y) ||
				bounds.maxX + minDist < Math.min(A.x, B.x) ||
				bounds.maxY + minDist < Math.min(A.y, B.y)
			) {
				continue
			}

			if (geometry.hitTestLineSegment(A, B, minDist)) {
				erasing.add(editor.getOutermostSelectableShape(shape).id)
			}
		}

		// Remove the hit shapes, except if they're in the list of excluded shapes
		// (these excluded shapes will be any frames or groups the pointer was inside of
		// when the user started erasing)
		this.editor.setErasingShapes(Array.from(erasing).filter((id) => !excludedShapeIds.has(id)))
	}
}
