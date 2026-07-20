import { StateNode } from 'tldraw'
import { REACTION_SIZE } from './ReactionShapeUtil'

// A stamp tool: every click drops a reaction at the pointer and the tool stays active for
// rapid-fire stamping. Escape (or picking another tool) leaves it. Setting `shapeType`
// makes the style panel show the reaction shape's styles (the emoji row) while the tool
// is active, and makes `createShape` fill the emoji prop from the current style.
export class ReactionTool extends StateNode {
	static override id = 'reaction'
	override shapeType = 'reaction'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onExit() {
		this.editor.setHintingShapes([])
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	// Highlight the shape a stamp would bind to, using the hinting indicator (the same
	// affordance the arrow tool shows over a bind target). The filter delegates to
	// `canBindShapes`, so the reaction shape's `canBind` rule — never bind to another
	// reaction — applies here without any extra logic; hovering an existing stamp
	// highlights the shape beneath it instead.
	override onPointerMove() {
		const { editor } = this
		const target = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), {
			hitInside: true,
			filter: (shape) =>
				!shape.isLocked &&
				editor.canBindShapes({ fromShape: 'reaction', toShape: shape, binding: 'reaction' }),
		})
		editor.setHintingShapes(target ? [target.id] : [])
	}

	override onPointerDown() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		// One stopping point per stamp, so undo removes stamps one at a time.
		editor.markHistoryStoppingPoint()
		editor.createShape({
			type: 'reaction',
			x: point.x - REACTION_SIZE / 2,
			y: point.y - REACTION_SIZE / 2,
		})
	}
}
