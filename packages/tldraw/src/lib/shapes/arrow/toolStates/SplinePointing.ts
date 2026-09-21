import { StateNode, TLArrowShape, Vec, VecLike, createShapeId } from '@tldraw/editor'
import { clearArrowTargetState } from '../arrowTargetState'
import { appendSplineArrowPoint } from '../spline-arrow'

export class SplinePointing extends StateNode {
	static override id = 'spline_pointing'
	private shape?: TLArrowShape
	private markId = ''
	private committed = false
	private isFirstPoint = false

	override onEnter(info: { origin?: VecLike }) {
		this.committed = false
		this.isFirstPoint = false
		this.markId = this.editor.markHistoryStoppingPoint('adding_arrow_point')
		const selected = this.editor.getOnlySelectedShape()
		if (
			!info.origin &&
			selected?.type === 'arrow' &&
			!this.editor.isShapeOrAncestorLocked(selected)
		) {
			this.shape = selected as TLArrowShape
			appendSplineArrowPoint(this.editor, this.shape)
		} else {
			const origin = info.origin ?? this.editor.inputs.getOriginPagePoint()
			this.isFirstPoint = !info.origin
			const id = createShapeId()
			this.editor
				.createShape<TLArrowShape>({
					id,
					type: 'arrow',
					x: origin.x,
					y: origin.y,
					props: {
						start: { x: 0, y: 0 },
						end: { x: 0.1, y: 0.1 },
						scale: this.editor.getResizeScaleFactor(),
					},
				})
				.select(id)
			this.shape = this.editor.getShape<TLArrowShape>(id)!
			this.moveHandle('start', Vec.From(origin))
		}
		this.update()
	}

	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) this.isFirstPoint = false
		this.update()
	}
	override onPointerUp() {
		this.update()
		this.committed = !this.isFirstPoint
		this.parent.transition('idle', {
			origin: this.isFirstPoint ? this.editor.inputs.getCurrentPagePoint().clone() : undefined,
		})
	}
	override onCancel() {
		this.parent.transition('idle')
	}
	override onInterrupt() {
		this.parent.transition('idle')
	}
	override onComplete() {
		this.onPointerUp()
	}
	override onExit() {
		if (!this.committed) this.editor.bailToMark(this.markId)
		clearArrowTargetState(this.editor)
		this.shape = undefined
	}
	private update() {
		if (this.isFirstPoint) this.moveHandle('start', this.editor.inputs.getCurrentPagePoint())
		this.moveHandle('end', this.editor.inputs.getCurrentPagePoint())
	}
	private moveHandle(id: 'start' | 'end', point: VecLike) {
		const shape = this.editor.getShape<TLArrowShape>(this.shape!.id)!
		const handle = this.editor.getShapeHandles(shape)!.find((handle) => handle.id === id)!
		const local = this.editor.getPointInShapeSpace(shape, point)
		const change = this.editor.getShapeUtil(shape).onHandleDrag?.(shape, {
			handle: { ...handle, x: local.x, y: local.y },
			isPrecise: true,
			isCreatingShape: true,
		})
		if (change) this.editor.updateShape(change)
	}
}
