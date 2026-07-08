import './comments.css'

/** @public */
export interface ReactionProps {
	emoji: string
	count: number
	active: boolean
}

/**
 * A single emoji reaction pill with a count, highlighted when the user reacted.
 * @public
 * @react
 */
export function Reaction({ emoji, count, active }: ReactionProps) {
	return (
		<button className={active ? 'cmt-reaction cmt-reaction--active' : 'cmt-reaction'} type="button">
			<span className="cmt-reaction__emoji">{emoji}</span>
			<span className="cmt-reaction__count">{count}</span>
		</button>
	)
}
