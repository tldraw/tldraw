import {
	BaseBoxShapeUtil,
	HTMLContainer,
	StyleProp,
	T,
	TLShape,
	TLShapeUtilCanBindOpts,
	VecModel,
} from 'tldraw'
import { bindReactionToShapeAtPoint } from './ReactionBindingUtil'

// The emoji is a style prop, so it behaves like color does for the draw tool: the style
// panel shows the options whenever the reaction tool is active or a reaction is selected,
// and the editor remembers the most recent choice for the next stamp.
export const ReactionEmojiStyle = StyleProp.defineEnum('reaction:emoji', {
	defaultValue: '👍',
	values: ['👍', '❤️', '🎉', '😂', '😮', '🔥'],
})

export type ReactionEmoji = T.TypeOf<typeof ReactionEmojiStyle>

export const REACTION_SIZE = 48

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		reaction: {
			w: number
			h: number
			emoji: ReactionEmoji
		}
	}
	// The `reaction` binding attaches a stamp to the shape it was placed on, storing the
	// stamp's spot as a normalized 0–1 anchor within the target's bounds (the same idea as
	// comment shape anchors). The BindingUtil that maintains it is the next build step; the
	// type is declared now so `canBind` / `canBindShapes` can already enforce the rules.
	export interface TLGlobalBindingPropsMap {
		reaction: {
			anchor: VecModel
		}
	}
}

export type ReactionShape = TLShape<'reaction'>

export class ReactionShapeUtil extends BaseBoxShapeUtil<ReactionShape> {
	static override type = 'reaction'

	static override props = {
		w: T.number,
		h: T.number,
		emoji: ReactionEmojiStyle,
	}

	getDefaultProps(): ReactionShape['props'] {
		return {
			w: REACTION_SIZE,
			h: REACTION_SIZE,
			emoji: '👍',
		}
	}

	// Reactions resize like any other shape, but keep their proportions so the glyph
	// scales instead of gaining empty padding.
	override isAspectRatioLocked() {
		return true
	}

	// Keep reactions out of the snap-alignment candidate list. Without this, dragging a
	// shape snaps against its own bound reactions — which the binding then moves to follow
	// the shape, so the snap target chases the drag and the movement jitters.
	override canSnap() {
		return false
	}

	// The one binding rule for reactions, enforced globally: a reaction can be the source of
	// a `reaction` binding to a non-reaction shape, and nothing else. `canBindShapes` asks
	// both shapes' utils, so this single override means arrows (or any other binding) skip
	// reactions entirely — they won't highlight one as a target, let alone bind to it — and
	// reactions can never bind to each other. Tools that filter targets through
	// `canBindShapes` (the arrow tool, our reaction tool's hover hint) inherit this for free.
	override canBind({ fromShape, toShape, bindingType }: TLShapeUtilCanBindOpts) {
		return (
			bindingType === 'reaction' && fromShape.type === 'reaction' && toShape.type !== 'reaction'
		)
	}

	// Picking a reaction up detaches it so it moves freely; dropping it re-attaches it to
	// whatever bindable shape is under its center, or leaves it free on empty canvas.
	// (Same gesture comments implement by overwriting their anchor field.)
	override onTranslateStart(shape: ReactionShape) {
		this.editor.deleteBindings(this.editor.getBindingsFromShape(shape, 'reaction'))
	}

	override onTranslateEnd(_initial: ReactionShape, shape: ReactionShape) {
		const center = this.editor
			.getShapePageTransform(shape)
			.applyToPoint({ x: shape.props.w / 2, y: shape.props.h / 2 })
		bindReactionToShapeAtPoint(this.editor, shape.id, center)
	}

	component(shape: ReactionShape) {
		const createdBy = shape.meta.createdBy
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: Math.min(shape.props.w, shape.props.h) * 0.8,
				}}
				title={typeof createdBy === 'string' ? `Reacted by ${createdBy}` : undefined}
			>
				{shape.props.emoji}
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: ReactionShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override toSvg(shape: ReactionShape) {
		return (
			<text
				x={shape.props.w / 2}
				y={shape.props.h / 2}
				fontSize={Math.min(shape.props.w, shape.props.h) * 0.8}
				textAnchor="middle"
				dominantBaseline="central"
			>
				{shape.props.emoji}
			</text>
		)
	}
}
