import {
	HIT_TEST_MARGIN,
	TLEventInfo,
	TLFrameShape,
	TLGroupShape,
	TLShapeId,
	ToolUtil,
	Vec,
	pointInPolygon,
} from 'tldraw'

type SimpleEraserContext = {
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

type SimpleEraserToolConfig = {
	scribbleSize: number
}

export class SimpleEraserToolUtil extends ToolUtil<SimpleEraserContext, SimpleEraserToolConfig> {
	static override type = '@simple/eraser' as const

	getDefaultConfig(): SimpleEraserToolConfig {
		return {
			scribbleSize: 12,
		}
	}

	getDefaultContext(): SimpleEraserContext {
		return {
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
				if (event.name === 'pointer_down') {
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
					this.startErasingAfterDragging()
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
		prevPoint: new Vec(),
	}

	private cancel() {
		const { memo, editor } = this

		// Reset the erasing shapes
		editor.setErasingShapes([])
		editor.bailToMark('erasing')

		// Stop the scribble
		const context = this.getContext()
		if (context.state.name === 'erasing') {
			editor.scribbles.stop(context.state.scribbleId)
		}

		memo.erasingShapeIds.clear()
		memo.excludedShapeIds.clear()
		memo.scribbleId = null

		this.setContext({ state: { name: 'idle' } })
	}

	private complete() {
		const { memo, editor } = this

		// Delete any shapes that were marked as erasing
		const erasingShapeIds = editor.getErasingShapeIds()
		if (erasingShapeIds.length) {
			editor.deleteShapes(erasingShapeIds)
			editor.setErasingShapes([])
		}

		// Stop the scribble
		const context = this.getContext()
		if (context.state.name === 'erasing') {
			editor.scribbles.stop(context.state.scribbleId)
		}

		memo.erasingShapeIds.clear()
		memo.excludedShapeIds.clear()
		memo.scribbleId = null

		this.setContext({ state: { name: 'idle' } })
	}

	private startErasingPointedShapes() {
		const { editor, memo } = this
		const { originPagePoint } = editor.inputs
		const { erasingShapeIds, prevPoint } = memo

		editor.mark('erasing')

		prevPoint.setTo(originPagePoint)

		const minDist = HIT_TEST_MARGIN / editor.getZoomLevel()

		// Populate the erasing shape ids working front to back...
		const shapes = editor.getCurrentPageShapesSorted()
		for (let i = shapes.length - 1; i > -1; i--) {
			const shape = shapes[i]

			// Look for hit shapes
			if (
				editor.isPointInShape(shape, originPagePoint, {
					hitInside: false,
					margin: minDist,
				})
			) {
				const hitShape = editor.getOutermostSelectableShape(shape)
				// If we've hit a frame after hitting any other shape, stop here
				if (editor.isShapeOfType<TLFrameShape>(hitShape, 'frame') && erasingShapeIds.size > 0) {
					break
				}

				erasingShapeIds.add(hitShape.id)
			}
		}

		editor.setErasingShapes(Array.from(erasingShapeIds))
	}

	private startErasingAfterDragging() {
		const {
			editor,
			memo: { erasingShapeIds, excludedShapeIds },
		} = this
		const { originPagePoint } = editor.inputs

		const scribble = editor.scribbles.addScribble({
			color: 'muted-1',
			size: 12,
		})
		this.setContext({
			state: {
				name: 'erasing',
				scribbleId: scribble.id,
			},
		})

		// Clear any erasing shapes from the pointing state
		erasingShapeIds.clear()

		// Populate the excluded shape ids and the erasing shape ids, working front to back...
		excludedShapeIds.clear()

		const shapes = editor.getCurrentPageShapesSorted()
		for (let i = shapes.length - 1; i > -1; i--) {
			const shape = shapes[i]
			if (
				// If the shape is locked, or its ancestor is locked...
				editor.isShapeOrAncestorLocked(shape) ||
				// ...or if it's a group or a frame and the click began inside the shape
				((editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
					editor.isShapeOfType<TLFrameShape>(shape, 'frame')) &&
					editor.isPointInShape(shape, originPagePoint, {
						hitInside: true,
						margin: 0,
					}))
			) {
				// exclude it from being erased
				excludedShapeIds.add(shape.id)
			}
		}
	}

	private updateErasingShapes() {
		const { editor, memo } = this

		const context = this.getContext()
		if (context.state.name !== 'erasing') return

		const { excludedShapeIds, erasingShapeIds, prevPoint } = memo
		const { scribbleId } = context.state

		const {
			inputs: { currentPagePoint },
		} = editor

		// Update scribble
		const { x, y } = currentPagePoint
		editor.scribbles.addPoint(scribbleId, x, y)

		const minDist = HIT_TEST_MARGIN / editor.getZoomLevel()

		const currentPageShapes = editor.getCurrentPageShapes()
		for (const shape of currentPageShapes) {
			// Skip groups
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
			const A = pt.applyToPoint(prevPoint)
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
				const shapeToErase = editor.getOutermostSelectableShape(shape)
				if (excludedShapeIds.has(shapeToErase.id)) continue
				erasingShapeIds.add(shapeToErase.id)
			}
		}

		// Update the prev page point for next segment
		prevPoint.setTo(currentPagePoint)

		// Remove the hit shapes
		editor.setErasingShapes(Array.from(erasingShapeIds))
	}
}
