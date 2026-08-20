import {
	StateNode,
	TLArrowShape,
	TLHandle,
	VecLike,
	createShapeId,
	maybeSnapToGrid,
} from '@tldraw/editor'
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
			pointInPageSpace: this.editor.inputs.getCurrentPagePoint(),
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
		if (this.editor.inputs.getIsDragging()) {
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

	override onLongPress() {
		// On a touch (coarse pointer) long-press, cancel the pending shape so it leaves nothing behind.
		if (this.editor.getInstanceState().isCoarsePointer) this.cancel()
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
		const originPagePoint = this.editor.inputs.getOriginPagePoint()

		const id = createShapeId()

		this.markId = this.editor.markHistoryStoppingPoint(`creating_arrow:${id}`)
		const newPoint = maybeSnapToGrid(originPagePoint, this.editor)
		this.editor.createShape({
			id,
			type: 'arrow',
			x: newPoint.x,
			y: newPoint.y,
			props: {
				scale: this.editor.getResizeScaleFactor(),
			},
		})

		const shape = this.editor.getShape<TLArrowShape>(id)
		if (!shape) return

		const handles = this.editor.getShapeHandles(shape)
		if (!handles) throw Error(`expected handles for arrow`)

		this.dragHandle(shape, handles, 'start', { x: 0, y: 0 }, true)

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
		this.dragHandle(shape, handles, 'start', { x: 0, y: 0 }, this.isPrecise)

		// end update
		const point = this.editor.getPointInShapeSpace(shape, this.editor.inputs.getCurrentPagePoint())
		this.dragHandle(this.editor.getShape(shape)!, handles, 'end', point, this.isPrecise)

		// Cache the current shape after those changes
		this.shape = this.editor.getShape(shape.id)
	}

	private dragHandle(
		shape: TLArrowShape,
		handles: TLHandle[],
		handleId: 'start' | 'end',
		point: VecLike,
		isPrecise: boolean
	) {
		const util = this.editor.getShapeUtil<TLArrowShape>('arrow')
		const handle = handles.find((h) => h.id === handleId)!
		const change = util.onHandleDrag?.(shape, {
			handle: { ...handle, x: point.x, y: point.y },
			isPrecise,
			isCreatingShape: true,
			initial: this.shape,
		})

		if (change) {
			this.editor.updateShapes([change])
		}
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
