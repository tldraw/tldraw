import { StateNode, TLArrowShape, createShapeId } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLArrowShape

	markId = ''

	override onEnter() {
		this.markId = ''
		this.didTimeout = false

		const target = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
			filter: (targetShape) => {
				return (
					!targetShape.isLocked &&
					this.editor.canBindShapes({ fromShape: 'arrow', toShape: targetShape, binding: 'arrow' })
				)
			},
			margin: 0,
			hitInside: true,
			renderingOnly: true,
		})

		if (!target) {
			this.createArrowShape()
		} else {
			this.editor.setHintingShapes([target.id])
		}

		this.startPreciseTimeout()
	}

	override onExit() {
		this.shape = undefined
		this.editor.setHintingShapes([])
		this.clearPreciseTimeout()
	}

	override onPointerMove() {
		if (this.editor.inputs.isDragging) {
			if (!this.shape) {
				this.createArrowShape()
			}

			if (!this.shape) throw Error(`expected shape`)

			// const initialEndHandle = this.editor.getShapeHandles(this.shape)!.find((h) => h.id === 'end')!
			this.updateArrowShapeEndHandle()

			this.editor.setCurrentTool('select.dragging_handle', {
				shape: this.shape,
				handle: { id: 'end', type: 'vertex', index: 'a3', x: 0, y: 0 },
				isCreating: true,
				creatingMarkId: this.markId || undefined,
				onInteractionEnd: 'arrow',
			})
		}
	}

	override onPointerUp() {
		this.cancel()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	cancel() {
		if (this.shape) {
			// the arrow might not have been created yet!
			this.editor.bailToMark(this.markId)
		}
		this.editor.setHintingShapes([])
		this.parent.transition('idle')
	}

	createArrowShape() {
		const { originPagePoint } = this.editor.inputs

		const id = createShapeId()

		this.markId = this.editor.markHistoryStoppingPoint(`creating_arrow:${id}`)

		this.editor.createShape<TLArrowShape>({
			id,
			type: 'arrow',
			x: originPagePoint.x,
			y: originPagePoint.y,
			props: {
				scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
			},
		})

		const shape = this.editor.getShape<TLArrowShape>(id)
		if (!shape) throw Error(`expected shape`)

		const handles = this.editor.getShapeHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
		const initial = this.shape
		const startHandle = handles.find((h) => h.id === 'start')!
		const change = util.onHandleDrag?.(shape, {
			handle: { ...startHandle, x: 0, y: 0 },
			isPrecise: true,
			initial: initial,
		})

		if (change) {
			this.editor.updateShapes([change])
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(id)
		this.editor.select(id)
	}

	updateArrowShapeEndHandle() {
		const shape = this.shape
		if (!shape) throw Error(`expected shape`)

		const handles = this.editor.getShapeHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		// start update
		{
			const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
			const initial = this.shape
			const startHandle = handles.find((h) => h.id === 'start')!
			const change = util.onHandleDrag?.(shape, {
				handle: { ...startHandle, x: 0, y: 0 },
				isPrecise: this.didTimeout, // sure about that?
				initial: initial,
			})

			if (change) {
				this.editor.updateShapes([change])
			}
		}

		// end update
		{
			const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
			const initial = this.shape
			const point = this.editor.getPointInShapeSpace(shape, this.editor.inputs.currentPagePoint)
			const endHandle = handles.find((h) => h.id === 'end')!
			const change = util.onHandleDrag?.(this.editor.getShape(shape)!, {
				handle: { ...endHandle, x: point.x, y: point.y },
				isPrecise: false, // sure about that?
				initial: initial,
			})

			if (change) {
				this.editor.updateShapes([change])
			}
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(shape.id)
	}

	private preciseTimeout = -1
	private didTimeout = false
	private startPreciseTimeout() {
		this.preciseTimeout = this.editor.timers.setTimeout(() => {
			if (!this.getIsActive()) return
			this.didTimeout = true
		}, 320)
	}
	private clearPreciseTimeout() {
		clearTimeout(this.preciseTimeout)
	}
}
