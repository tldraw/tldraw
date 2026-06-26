import { StateNode, TLGeoShape, TLShapeId, Vec } from '@tldraw/editor'

/** Info passed when transitioning into the morph-tuning state. */
export interface MorphTuningInfo {
	shapeId: TLShapeId
	/** Page-space corner that stays fixed while the opposite corner is dragged. */
	anchorPagePos: Vec
	/** atan2 of the vector from anchor to drag corner in the rect's local space. */
	localAspectAngle: number
	originalW: number
	originalH: number
	/** Length of the local-space diagonal at morph time (sqrt(w²+h²)). */
	originalDiagLen: number
	/** Mark set just before createShape in tryMorph; cancel uses this to remove the shape. */
	morphMark: string
}

/**
 * Entered after a magic-wand morph fires while the pointer is still held. The
 * user can drag to fine-tune the rectangle's scale and rotation; the anchor
 * corner (diagonally opposite the nearest corner to the pointer) stays fixed.
 */
export class MagicWandMorphTuning extends StateNode {
	static override id = 'morph-tuning'

	private shapeId: TLShapeId | null = null
	private anchorPagePos = new Vec(0, 0)
	private localAspectAngle = 0
	private originalW = 0
	private originalH = 0
	private originalDiagLen = 0
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
		this.anchorPagePos = info.anchorPagePos.clone()
		this.localAspectAngle = info.localAspectAngle
		this.originalW = info.originalW
		this.originalH = info.originalH
		this.originalDiagLen = info.originalDiagLen
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
		const diag = Vec.Sub(pointer, this.anchorPagePos)
		const diagLen = Math.max(diag.len(), 1)
		const diagAngle = Math.atan2(diag.y, diag.x)
		const newRotation = diagAngle - this.localAspectAngle
		const scale = diagLen / this.originalDiagLen
		const newW = Math.max(1, this.originalW * scale)
		const newH = Math.max(1, this.originalH * scale)
		const newCenter = Vec.Lrp(this.anchorPagePos, pointer, 0.5)
		const topLeft = Vec.Sub(newCenter, Vec.Rot(new Vec(newW / 2, newH / 2), newRotation))
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
