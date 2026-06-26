import { StateNode, TLGeoShape, TLShapeId, Vec, snapAngle } from '@tldraw/editor'

/** Rotation snap increments while shift is held (24 segments = every 15°). */
const ROTATION_SNAP_SEGMENTS = 24

/** Info passed when transitioning into the morph-tuning state. */
export interface MorphTuningInfo {
	shapeId: TLShapeId
	/** Page-space center of the morphed rectangle (stays fixed during tuning). */
	centerPagePos: Vec
	/**
	 * Vector from the center to the pointer in page space at the moment the morph
	 * fired. This is the tuning reference: scale and rotation are measured against
	 * it, so the drag starts as a no-op (scale 1, rotation 0) — the pointer keeps
	 * the same grip on the shape it had when it spawned, with no jump.
	 */
	initialPointerOffset: Vec
	originalW: number
	originalH: number
	/** Mark set just before createShape in tryMorph; cancel uses this to remove the shape. */
	morphMark: string
}

/**
 * Entered after a magic-wand morph fires while the pointer is still held. The
 * user can drag to fine-tune the rectangle's scale and rotation about its fixed
 * center. The pointer keeps the same relative grip on the shape it had at morph
 * time: as the pointer's distance and angle from the center change, the
 * rectangle scales and rotates to match, so the grabbed point tracks the cursor.
 */
export class MagicWandMorphTuning extends StateNode {
	static override id = 'morph-tuning'

	private shapeId: TLShapeId | null = null
	private centerPagePos = new Vec(0, 0)
	private initialPointerOffset = new Vec(0, 0)
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
		this.initialPointerOffset = info.initialPointerOffset.clone()
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

	// Pressing or releasing shift re-applies the tune so the rotation snap toggles
	// without needing to move the pointer (matching the select tool's rotate).
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

	private computeNewRect(pointer: Vec) {
		// Current vector from the fixed center to the pointer, compared against the
		// reference vector captured at morph time. Their ratio is the scale and
		// their angle difference is the rotation delta — both zero at drag start.
		const vec = Vec.Sub(pointer, this.centerPagePos)
		const vecLen = Math.max(vec.len(), 1)
		const initialLen = Math.max(this.initialPointerOffset.len(), 1)

		const scale = vecLen / initialLen
		const rotationDelta =
			Math.atan2(vec.y, vec.x) -
			Math.atan2(this.initialPointerOffset.y, this.initialPointerOffset.x)
		let newRotation = (this.initialMorphState?.rotation ?? 0) + rotationDelta
		// Holding shift snaps to the nearest 15°, just like the select rotate tool.
		if (this.editor.inputs.getShiftKey()) {
			newRotation = snapAngle(newRotation, ROTATION_SNAP_SEGMENTS)
		}

		// Uniform scale keeps the pointer's grip at the same normalized position
		// inside the rectangle as it grows or shrinks.
		const newW = Math.max(1, this.originalW * scale)
		const newH = Math.max(1, this.originalH * scale)
		// The shape's (x, y) is the page position of its local origin (0, 0); the
		// center in page space is origin + Rot((w/2, h/2), rotation), so solve for
		// the origin that keeps the center fixed.
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
