import { Reaction } from './reaction'

/** One emoji's reactions on a comment, already tallied. @public */
export interface ReactionSummary {
	emoji: string
	/** How many people reacted with this emoji. */
	count: number
	/** True when the current user is one of them — renders the pill highlighted. */
	active: boolean
}

/** @public */
export interface ReactionsProps {
	/** The comment's reactions, grouped by emoji. Empty renders nothing. */
	reactions: ReactionSummary[]
	/** Toggles the current user's reaction for an emoji. */
	onToggle?(emoji: string): void
	/** Whether the current user may react. False makes the pills inert (e.g. a signed-out
	 *  viewer, or a read-only thread) while still showing counts. */
	canReact?: boolean
}

/**
 * The row of tallied reactions under a comment. Presentational — the host supplies the summaries
 * and owns what toggling does.
 *
 * The add-reaction affordance is a separate component (`ReactionPicker`) so it can live outside
 * this row — on a comment card it sits with the card's hover actions, which keeps its position
 * fixed as reactions are added here.
 * @public @react
 */
export function Reactions({ reactions, onToggle, canReact = true }: ReactionsProps) {
	if (reactions.length === 0) return null
	return (
		<div className="tlui-cmt-reactions">
			{reactions.map((reaction) => (
				<Reaction
					key={reaction.emoji}
					{...reaction}
					onClick={canReact ? () => onToggle?.(reaction.emoji) : undefined}
				/>
			))}
		</div>
	)
}
