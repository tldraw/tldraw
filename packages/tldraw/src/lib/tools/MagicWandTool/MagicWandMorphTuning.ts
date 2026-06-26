import { StateNode, TLGeoShape, TLShapeId, Vec } from '@tldraw/editor'

/** Info passed when transitioning into the morph-tuning state. */
export interface MorphTuningInfo {
	shapeId: TLShapeId
	/** Page-space center of the morphed rectangle (stays fixed during tuning). */
	centerPagePos: Vec
	/**
	 * Vector from the center to the drag corner in page space at morph time.
	 * Encodes both the initial half-diagonal length and the initial corner angle.
	 */
	initialCornerOffset: Vec
	originalW: number
	originalH: number
	/** Mark set just before createShape in tryMorph; cancel uses this to remove the shape. */
	morphMark: string
}

/**
 * Entered after a magic-wand morph fires while the pointer is still held. The
 * user can drag the nearest corner to fine-tune the rectangle's scale and
 * rotation; the center of the rectangle stays fixed.
 */
export class MagicWandMorphTuning extends StateNode {
	static override id = 'morph-tuning'

	private shapeId: TLShapeId | null = null
	private centerPagePos = new Vec(0, 0)
	private initialCornerOffset = new Vec(0, 0)
	private originalW = 0
	private originalH = 0
	private morphMark: string | null = null
	// Recorded at entry; used to produce a single clean committed diff on pointer-up.
	private initialMorphState: {
		x: number
		y: number
		rotation: number
		w: number
		h: number
	} | null = null

	override onEnter(info: MorphTuningInfo) {
		this.shapeId = info.shapeId
		this.centerPagePos = info.centerPagePos.clone()
		this.initialCornerOffset = info.initialCornerOffset.clone()
		this.originalW = info.originalW
		this.originalH = info.originalH
		this.morphMark = info.morphMark

		const shape = this.editor.getShape<TLGeoShape>(info.shapeId)
		if (shape) {
			this.initialMorphState = {
				x: shape.x,
				y: shape.y,
				rotation: shape.rotation,
				w: shape.props.w,
				h: shape.props.h,
			}
		}
	}

	override onExit() {
		this.shapeId = null
		this.initialMorphState = null
	}

	override onPointerMove() {
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

	private computeNewRect(pointer: Vec) {
		// Vector from the fixed center to the current pointer position.
		const vec = Vec.Sub(pointer, this.centerPagePos)
		const vecLen = Math.max(vec.len(), 1)
		const initialLen = Math.max(this.initialCornerOffset.len(), 1)

		const scale = vecLen / initialLen
		// Rotation delta = angle change from the initial corner direction.
		const rotationDelta =
			Math.atan2(vec.y, vec.x) - Math.atan2(this.initialCornerOffset.y, this.initialCornerOffset.x)
		const newRotation = (this.initialMorphState?.rotation ?? 0) + rotationDelta

		const newW = Math.max(1, this.originalW * scale)
		const newH = Math.max(1, this.originalH * scale)
		// The shape's (x, y) is the page position of its local origin (0, 0); the
		// center in page space is origin + Rot((w/2, h/2), rotation).
		const topLeft = Vec.Sub(this.centerPagePos, Vec.Rot(new Vec(newW / 2, newH / 2), newRotation))
		return { newW, newH, newRotation, topLeft }
	}

	/**
	 * Applies the drag result as either a history-ignored preview (commit=false)
	 * or a committed update (commit=true). On commit, the shape is first silently
	 * reverted to its morph-time state so the undo entry records the full delta
	 * from the initial morph position rather than a no-op.
	 */
	private applyTune(commit: boolean) {
		if (!this.shapeId) return
		const pointer = this.editor.inputs.getCurrentPagePoint()
		const { newW, newH, newRotation, topLeft } = this.computeNewRect(pointer)

		if (commit && this.initialMorphState) {
			const s = this.initialMorphState
			// Silently revert so the committed diff goes from the morph position.
			this.editor.run(
				() =>
					this.editor.updateShape<TLGeoShape>({
						id: this.shapeId!,
						type: 'geo',
						x: s.x,
						y: s.y,
						rotation: s.rotation,
						props: { w: s.w, h: s.h },
					}),
				{ history: 'ignore' }
			)
			this.editor.updateShape<TLGeoShape>({
				id: this.shapeId,
				type: 'geo',
				x: topLeft.x,
				y: topLeft.y,
				rotation: newRotation,
				props: { w: newW, h: newH },
			})
		} else {
			this.editor.run(
				() =>
					this.editor.updateShape<TLGeoShape>({
						id: this.shapeId!,
						type: 'geo',
						x: topLeft.x,
						y: topLeft.y,
						rotation: newRotation,
						props: { w: newW, h: newH },
					}),
				{ history: 'ignore' }
			)
		}
	}
}
