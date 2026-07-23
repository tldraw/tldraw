/** @public */
export interface ReactionProps {
	emoji: string
	count: number
	active: boolean
}

/** A single emoji reaction pill with a count, highlighted when the user reacted. @public @react */
export function Reaction({ emoji, count, active }: ReactionProps) {
	return (
		<button
			className={active ? 'tlui-cmt-reaction tlui-cmt-reaction--active' : 'tlui-cmt-reaction'}
			type="button"
		>
			<span className="tlui-cmt-reaction__emoji">{emoji}</span>
			<span className="tlui-cmt-reaction__count">{count}</span>
		</button>
	)
}
