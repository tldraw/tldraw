/* eslint-disable react-hooks/rules-of-hooks */
import {
	HIT_TEST_MARGIN,
	Scribble,
	TLEventInfo,
	TLFrameShape,
	TLGroupShape,
	TLScribble,
	TLShapeId,
	ToolUtil,
	Vec,
	pointInPolygon,
} from 'tldraw'

type SimpleEraserContext =
	| {
			name: 'idle'
			scribbles: TLScribble[]
	  }
	| {
			name: 'pointing'
			scribbles: TLScribble[]
	  }
	| {
			name: 'erasing'
			scribbles: TLScribble[]
	  }

type SimpleEraserToolConfig = {
	scribbleSize: number
	scribbleColor: TLScribble['color']
}

export class SimpleEraserToolUtil extends ToolUtil<SimpleEraserContext, SimpleEraserToolConfig> {
	id = 'eraser' as const

	getDefaultConfig(): SimpleEraserToolConfig {
		return {
			scribbleSize: 12,
			scribbleColor: 'muted-1',
		}
	}

	getDefaultContext(): SimpleEraserContext {
		return {
			name: 'idle',
			scribbles: [],
		}
	}

	// override overlay() {
	// 	const { editor } = this
	// 	const zoom = editor.getZoomLevel()
	// 	const { Scribble } = useEditorComponents()
	// 	if (!Scribble) return

	// 	return (
	// 		<>
	// 			{this.getState().scribbles.map((scribble) => (
	// 				<Scribble
	// 					key={scribble.id}
	// 					className="tl-user-scribble"
	// 					scribble={scribble}
	// 					zoom={zoom}
	// 				/>
	// 			))}
	// 		</>
	// 	)
	// }

	override onEnter() {
		const { editor } = this
		editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		const { editor } = this
		editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onEvent(event: TLEventInfo) {
		const { editor } = this
		const state = this.getState()

		if (event.name === 'cancel') {
			this.cancel()
			return
		}

		if (event.name === 'complete') {
			this.complete()
			return
		}

		if (event.name === 'tick') {
			this.updateScribbles(event.elapsed)
		}

		switch (state.name) {
			case 'idle': {
				if (event.name === 'pointer_down') {
					// started pointing
					this.setState({
						...state,
						name: 'pointing',
					})
					this.startScribble()
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
					this.setState({
						...state,
						name: 'erasing',
					})
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
		scribbles: new Map<string, Scribble>(),
		excludedShapeIds: new Set<TLShapeId>(),
		erasingShapeIds: new Set<TLShapeId>(),
		prevPoint: new Vec(),
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
		const { editor, memo } = this
		const { erasingShapeIds, excludedShapeIds } = memo
		const { originPagePoint } = editor.inputs

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

		const state = this.getState()
		if (state.name !== 'erasing') return

		const { excludedShapeIds, erasingShapeIds, prevPoint } = memo

		const {
			inputs: { currentPagePoint },
		} = editor

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

	private startScribble() {
		const {
			memo,
			config: { scribbleColor, scribbleSize },
		} = this
		const { scribbles } = memo
		const scribble = new Scribble({
			color: scribbleColor,
			size: scribbleSize,
		})
		memo.scribbleId = scribble.id
		scribbles.set(scribble.id, scribble)
		this.setState({
			...this.getState(),
			scribbles: Array.from(scribbles.values()).map((s) => ({ ...s.current })),
		})
	}

	private updateScribbles(elapsed: number) {
		const {
			memo: { scribbleId, scribbles },
			editor,
		} = this

		if (scribbles.size === 0) {
			return
		}

		if (scribbleId) {
			const { x, y } = editor.inputs.currentPagePoint
			const scribble = scribbles.get(scribbleId)
			if (!scribble) throw Error('Expected a scribble')
			scribble.addPoint(x, y)
		}

		scribbles.forEach((scribble) => {
			scribble.tick(elapsed)
			if (scribble.state === 'stopped') {
				scribbles.delete(scribble.id)
			}
		})

		this.setState({
			...this.getState(),
			scribbles: Array.from(scribbles.values()).map((s) => ({ ...s.current })),
		})
	}

	private stopScribble() {
		const { memo } = this
		const { scribbleId, scribbles } = memo
		if (scribbleId) {
			const scribble = scribbles.get(scribbleId)
			scribble?.stop()
			memo.scribbleId = null
		}
	}

	private cancel() {
		const { memo, editor } = this

		// Roll back the current
		editor.bailToMark('erasing')

		memo.erasingShapeIds.clear()
		memo.excludedShapeIds.clear()

		this.stopScribble()
		this.setState({ ...this.getState(), name: 'idle' })
	}

	private complete() {
		const { memo, editor } = this

		// Delete any shapes that were marked as erasing
		const erasingShapeIds = editor.getErasingShapeIds()
		if (erasingShapeIds.length) {
			editor.deleteShapes(erasingShapeIds)
			editor.setErasingShapes([])
		}

		memo.erasingShapeIds.clear()
		memo.excludedShapeIds.clear()

		this.stopScribble()
		this.setState({ ...this.getState(), name: 'idle' })
	}
}
