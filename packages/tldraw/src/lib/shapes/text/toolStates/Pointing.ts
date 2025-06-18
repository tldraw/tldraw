import {
	StateNode,
	TLPointerEventInfo,
	TLShapeId,
	TLTextShape,
	Vec,
	createShapeId,
	isShapeId,
	maybeSnapToGrid,
	toRichText,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLTextShape

	markId = ''

	enterTime = 0
	override onEnter(): void {
		this.enterTime = Date.now()
	}

	override onExit() {
		this.editor.setHintingShapes([])
	}

	override onPointerMove(info: TLPointerEventInfo) {
		// Create a fixed width shape if the user wants to do that.

		// Don't create a fixed width shape unless the the drag is a little larger,
		// otherwise you get a vertical column of single characters if you accidentally
		// drag a bit unintentionally.

		// If the user hasn't been pointing for more than 150ms, don't create a fixed width shape
		if (Date.now() - this.enterTime < 150) return

		const { editor } = this
		const { isPointing } = editor.inputs

		if (!isPointing) return

		const { originPagePoint, currentPagePoint } = editor.inputs

		const currentDragDist = Math.abs(originPagePoint.x - currentPagePoint.x)

		const baseMinDragDistForFixedWidth = Math.sqrt(
			editor.getInstanceState().isCoarsePointer
				? editor.options.coarseDragDistanceSquared
				: editor.options.dragDistanceSquared
		)

		// Ten times the base drag distance for fixed width
		const minSquaredDragDist = (baseMinDragDistForFixedWidth * 6) / editor.getZoomLevel()

		if (currentDragDist > minSquaredDragDist) {
			const id = createShapeId()
			this.markId = editor.markHistoryStoppingPoint(`creating_text:${id}`)

			// create the initial shape with the width that we've dragged
			const shape = this.createTextShape(id, originPagePoint, false, currentDragDist)

			if (!shape) {
				this.cancel()
				return
			}

			// Now save the fresh reference
			this.shape = editor.getShape(shape)

			editor.select(id)

			const scale = this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1

			editor.setCurrentTool('select.resizing', {
				...info,
				target: 'selection',
				handle: 'right',
				isCreating: true,
				creatingMarkId: this.markId,
				// Make sure the cursor offset takes into account how far we've already dragged
				creationCursorOffset: { x: currentDragDist * scale, y: 1 },
				onInteractionEnd: 'text',
				onCreate: () => {
					editor.setEditingShape(shape.id)
					// this will automatically set the state to 'select.editing_shape'
				},
			})
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.cancel()
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private complete() {
		this.editor.markHistoryStoppingPoint('creating text shape')
		const id = createShapeId()
		const { originPagePoint } = this.editor.inputs
		const shape = this.createTextShape(id, originPagePoint, true, 20)
		if (!shape) return

		this.editor.select(id)
		this.editor.setEditingShape(id)
		// this will automatically set the state to 'select.editing_shape'
	}

	private cancel() {
		this.parent.transition('idle')
		this.editor.bailToMark(this.markId)
	}

	private createTextShape(id: TLShapeId, point: Vec, autoSize: boolean, width: number) {
		this.editor.createShape<TLTextShape>({
			id,
			type: 'text',
			x: point.x,
			y: point.y,
			props: {
				richText: toRichText(''),
				autoSize,
				w: width,
				scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
			},
		})

		const shape = this.editor.getShape<TLTextShape>(id)
		if (!shape) {
			this.cancel()
			return
		}

		const bounds = this.editor.getShapePageBounds(shape)!

		const delta = new Vec()

		if (autoSize) {
			switch (shape.props.textAlign) {
				case 'start': {
					delta.x = 0
					break
				}
				case 'middle': {
					delta.x = -bounds.width / 2
					break
				}
				case 'end': {
					delta.x = -bounds.width
					break
				}
			}
		} else {
			delta.x = 0
		}

		delta.y = -bounds.height / 2

		if (isShapeId(shape.parentId)) {
			const transform = this.editor.getShapeParentTransform(shape)
			delta.rot(-transform.rotation())
		}

		const shapeX = shape.x + delta.x
		const shapeY = shape.y + delta.y
		if (this.editor.getInstanceState().isGridMode) {
			const topLeft = new Vec(shapeX, shapeY)
			const gridSnappedPoint = maybeSnapToGrid(topLeft, this.editor)
			const gridDelta = Vec.Sub(topLeft, gridSnappedPoint)
			this.editor.updateShape({
				...shape,
				x: shapeX - gridDelta.x,
				y: shapeY - gridDelta.y,
			})
		} else {
			this.editor.updateShape({
				...shape,
				x: shapeX,
				y: shapeY,
			})
		}

		return shape
	}
}
