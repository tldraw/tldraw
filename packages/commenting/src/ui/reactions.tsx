import { Reaction } from './reaction'

/** One person who reacted with a given emoji, for the hover list. @public */
export interface ReactionReactor {
	/** Display name of the person who reacted. */
	name: string
	/** True for the current user. */
	you: boolean
}

/** One emoji's reactions on a comment, already tallied. @public */
export interface ReactionSummary {
	emoji: string
	/** How many people reacted with this emoji. */
	count: number
	/** True when the current user is one of them — renders the pill highlighted. */
	active: boolean
	/** Who reacted with this emoji, in reaction order — shown in the hover list. */
	reactors: ReactionReactor[]
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
	/** Whether the current user appears in the hover list of reactors. When false, a reaction only
	 *  the current user made shows no hover list. Defaults to true. */
	showSelf?: boolean
	/** Whether hovering a pill shows its reactor list. Pass false to suppress it — e.g. while
	 *  another popup menu on the comment is open. Defaults to true. */
	enableHoverList?: boolean
}

/**
 * The row of tallied reactions under a comment. Presentational — the host supplies the summaries
 * and owns what toggling does. Hovering a pill lists who reacted (see `Reaction`).
 *
 * The add-reaction affordance is a separate component (`ReactionPicker`) so it can live outside
 * this row — on a comment card it sits with the card's hover actions, which keeps its position
 * fixed as reactions are added here.
 * @public @react
 */
export function Reactions({
	reactions,
	onToggle,
	canReact = true,
	showSelf = true,
	enableHoverList = true,
}: ReactionsProps) {
	if (reactions.length === 0) return null
	return (
		<div className="tlui-cmt-reactions">
			{reactions.map((reaction) => (
				<Reaction
					key={reaction.emoji}
					{...reaction}
					showSelf={showSelf}
					enableHoverList={enableHoverList}
					onClick={canReact ? () => onToggle?.(reaction.emoji) : undefined}
				/>
			))}
		</div>
	)
}
