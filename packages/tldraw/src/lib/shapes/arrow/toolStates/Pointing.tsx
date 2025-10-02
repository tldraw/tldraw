import { StateNode, TLArrowShape, createShapeId, maybeSnapToGrid } from '@tldraw/editor'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { clearArrowTargetState, updateArrowTargetState } from '../arrowTargetState'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLArrowShape

	isPrecise = false
	isPreciseTimerId: number | null = null

	markId = ''

	override onEnter(info: { isPrecise?: boolean }) {
		this.markId = ''
		this.isPrecise = !!info.isPrecise

		const targetState = updateArrowTargetState({
			editor: this.editor,
			pointInPageSpace: this.editor.inputs.currentPagePoint,
			arrow: undefined,
			isPrecise: this.isPrecise,
			currentBinding: undefined,
			oppositeBinding: undefined,
		})

		if (!targetState) {
			this.createArrowShape()
			if (!this.shape) {
				this.cancel()
				return
			}
		}

		this.startPreciseTimeout()
	}

	override onExit() {
		this.shape = undefined
		clearArrowTargetState(this.editor)
		this.clearPreciseTimeout()
	}

	override onPointerMove() {
		if (this.editor.inputs.isDragging) {
			if (!this.shape) {
				this.createArrowShape()
			}

			if (!this.shape) {
				this.cancel()
				return
			}

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
		this.parent.transition('idle')
	}

	createArrowShape() {
		const { originPagePoint } = this.editor.inputs

		const id = createShapeId()

		this.markId = this.editor.markHistoryStoppingPoint(`creating_arrow:${id}`)
		const newPoint = maybeSnapToGrid(originPagePoint, this.editor)
		this.editor.createShape<TLArrowShape>({
			id,
			type: 'arrow',
			x: newPoint.x,
			y: newPoint.y,
			props: {
				scale: this.editor.user.getIsDynamicResizeMode() ? 1 / this.editor.getZoomLevel() : 1,
			},
		})

		const shape = this.editor.getShape<TLArrowShape>(id)
		if (!shape) return

		const handles = this.editor.getShapeHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
		const initial = this.shape
		const startHandle = handles.find((h) => h.id === 'start')!
		const change = util.onHandleDrag?.(shape, {
			handle: { ...startHandle, x: 0, y: 0 },
			isPrecise: true,
			isCreatingShape: true,
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
				isPrecise: this.isPrecise,
				isCreatingShape: true,
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
				isPrecise: this.isPrecise,
				isCreatingShape: true,
				initial: initial,
			})

			if (change) {
				this.editor.updateShapes([change])
			}
		}

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(shape.id)
	}

	private startPreciseTimeout() {
		const arrowUtil = this.editor.getShapeUtil<ArrowShapeUtil>('arrow')

		this.isPreciseTimerId = this.editor.timers.setTimeout(() => {
			if (!this.getIsActive()) return
			this.isPrecise = true
		}, arrowUtil.options.pointingPreciseTimeout)
	}

	private clearPreciseTimeout() {
		if (this.isPreciseTimerId !== null) {
			clearTimeout(this.isPreciseTimerId)
		}
	}
}
