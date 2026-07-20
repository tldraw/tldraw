import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Box,
	Editor,
	TLBinding,
	TLShapeId,
	invLerp,
	lerp,
} from 'tldraw'
import type { ReactionShape } from './ReactionShapeUtil'

type ReactionBinding = TLBinding<'reaction'>

// Keeps a bound reaction riding its target. Copied from the sticker-bindings example: the
// binding stores a normalized 0–1 anchor within the target's bounds, and whenever the
// target changes we rewrite the reaction's position so its center sits on that anchor.
export class ReactionBindingUtil extends BindingUtil<ReactionBinding> {
	static override type = 'reaction'

	override getDefaultProps() {
		return {
			anchor: { x: 0.5, y: 0.5 },
		}
	}

	// When the shape a reaction is stuck to moves, resizes, or rotates, move the reaction.
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<ReactionBinding>): void {
		// During undo/redo the history diff already contains the reaction's correct position;
		// writing here would corrupt the replay. (Same guard the arrow binding uses.)
		if (this.editor.isReplayingHistory()) return

		const reaction = this.editor.getShape<ReactionShape>(binding.fromId)
		if (!reaction) return

		const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(shapeAfter)!.bounds)
		const anchorInTargetSpace = {
			x: lerp(targetBounds.minX, targetBounds.maxX, binding.props.anchor.x),
			y: lerp(targetBounds.minY, targetBounds.maxY, binding.props.anchor.y),
		}
		const pageAnchor = this.editor
			.getShapePageTransform(shapeAfter)
			.applyToPoint(anchorInTargetSpace)
		const anchorInParentSpace = this.editor
			.getShapeParentTransform(reaction)
			.invert()
			.applyToPoint(pageAnchor)

		this.editor.updateShape({
			id: reaction.id,
			type: 'reaction',
			x: anchorInParentSpace.x - reaction.props.w / 2,
			y: anchorInParentSpace.y - reaction.props.h / 2,
		})
	}

	// When the shape a reaction is stuck to is deleted, delete the reaction too.
	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<ReactionBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

/**
 * Bind a reaction to whatever bindable shape sits under `pagePoint`, storing the point as
 * a normalized anchor within that shape's bounds. No shape there → the reaction stays
 * free-floating. The filter delegates to `canBindShapes`, so the reaction shape's
 * `canBind` rule (never bind to another reaction) applies here and to the hover hint
 * identically.
 */
export function bindReactionToShapeAtPoint(
	editor: Editor,
	reactionId: TLShapeId,
	pagePoint: { x: number; y: number }
) {
	const reaction = editor.getShape<ReactionShape>(reactionId)
	if (!reaction) return

	const target = editor.getShapeAtPoint(pagePoint, {
		hitInside: true,
		filter: (shape) =>
			!shape.isLocked &&
			editor.canBindShapes({ fromShape: reaction, toShape: shape, binding: 'reaction' }),
	})
	if (!target) return

	const targetBounds = Box.ZeroFix(editor.getShapeGeometry(target).bounds)
	const pointInTargetSpace = editor.getPointInShapeSpace(target, pagePoint)
	const anchor = {
		x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
		y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
	}

	editor.createBinding({
		type: 'reaction',
		fromId: reactionId,
		toId: target.id,
		props: { anchor },
	})
}
