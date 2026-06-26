import { StateNode, TLLineShape, TLShapeId, Vec, snapAngle } from '@tldraw/editor'

/** Line angle snap increments while shift is held (24 segments = every 15°). */
const LINE_ANGLE_SNAP_SEGMENTS = 24

/** Info passed when transitioning into the line-tuning state. */
export interface LineTuningInfo {
	shapeId: TLShapeId
	/** Page-space start vertex — stays fixed while the end is dragged. */
	startPagePos: Vec
	/** Index key of the end vertex being dragged. */
	endPointKey: string
	/**
	 * end − pointer at morph time. Tracking the pointer plus this offset keeps the
	 * grip the pointer had on the end vertex, so the drag starts with no jump.
	 */
	pointerToEndOffset: Vec
	/** Mark set just before createShape in tryMorph; cancel bails here to remove the line. */
	morphMark: string
}

/**
 * Entered after a magic-wand line morph fires while the pointer is still held.
 * Dragging moves the line's end vertex (the start stays fixed) until release.
 * Holding shift snaps the line's angle to the nearest 15°, like the line tool.
 */
export class MagicWandLineTuning extends StateNode {
	static override id = 'line-tuning'

	private shapeId: TLShapeId | null = null
	private startPagePos = new Vec(0, 0)
	private endPointKey = ''
	private pointerToEndOffset = new Vec(0, 0)
	private morphMark: string | null = null
	// The end vertex's local coords at morph time; used to make the commit a single
	// clean undo step (revert to here, then record the move to the final position).
	private initialEnd: { x: number; y: number } | null = null

	override onEnter(info: LineTuningInfo) {
		this.shapeId = info.shapeId
		this.startPagePos = info.startPagePos.clone()
		this.endPointKey = info.endPointKey
		this.pointerToEndOffset = info.pointerToEndOffset.clone()
		this.morphMark = info.morphMark

		const endPoint = this.editor.getShape<TLLineShape>(info.shapeId)?.props.points[info.endPointKey]
		if (endPoint) this.initialEnd = { x: endPoint.x, y: endPoint.y }
	}

	override onExit() {
		this.shapeId = null
		this.initialEnd = null
	}

	override onPointerMove() {
		this.applyTune(false)
	}

	// Pressing or releasing shift re-applies the tune so the angle snap toggles
	// without needing to move the pointer (matching the select/line tools).
	override onKeyDown() {
		this.applyTune(false)
	}

	override onKeyUp() {
		this.applyTune(false)
	}

	override onPointerUp() {
		this.applyTune(true)
		this.parent.transition('idle')
	}

	override onCancel() {
		if (this.morphMark) this.editor.bailToMark(this.morphMark)
		this.parent.transition('idle')
	}

	/** The end vertex's new local coords (relative to the fixed start). */
	private computeEndLocal(pointer: Vec): Vec {
		// Keep the grip the pointer had on the end at morph time (no jump at start).
		const endPage = Vec.Add(pointer, this.pointerToEndOffset)
		const vec = Vec.Sub(endPage, this.startPagePos)
		if (this.editor.inputs.getShiftKey()) {
			// Snap the line's angle to the nearest 15°, keeping its length.
			const length = vec.len()
			const angle = snapAngle(Math.atan2(vec.y, vec.x), LINE_ANGLE_SNAP_SEGMENTS)
			return new Vec(Math.cos(angle) * length, Math.sin(angle) * length)
		}
		return vec
	}

	/**
	 * Applies the drag as a history-ignored preview (commit=false) or a committed
	 * update (commit=true). On commit, the end is first reverted to its morph-time
	 * position so the undo entry records the full move as one step.
	 */
	private applyTune(commit: boolean) {
		if (!this.shapeId) return
		const shape = this.editor.getShape<TLLineShape>(this.shapeId)
		const endPoint = shape?.props.points[this.endPointKey]
		if (!shape || !endPoint) return

		const endLocal = this.computeEndLocal(this.editor.inputs.getCurrentPagePoint())
		const writeEnd = (x: number, y: number) =>
			this.editor.updateShape<TLLineShape>({
				id: this.shapeId!,
				type: 'line',
				props: { points: { ...shape.props.points, [this.endPointKey]: { ...endPoint, x, y } } },
			})

		if (commit && this.initialEnd) {
			this.editor.run(() => writeEnd(this.initialEnd!.x, this.initialEnd!.y), { history: 'ignore' })
			writeEnd(endLocal.x, endLocal.y)
		} else {
			this.editor.run(() => writeEnd(endLocal.x, endLocal.y), { history: 'ignore' })
		}
	}
}
