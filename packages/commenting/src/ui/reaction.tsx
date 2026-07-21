/** @public */
export interface ReactionProps {
	emoji: string
	count: number
	active: boolean
	/** Called when the pill is pressed — toggles the current user's reaction. */
	onClick?(): void
}

/** A single emoji reaction pill with a count, highlighted when the user reacted. @public @react */
export function Reaction({ emoji, count, active, onClick }: ReactionProps) {
	return (
		<button
			className={active ? 'tlui-cmt-reaction tlui-cmt-reaction--active' : 'tlui-cmt-reaction'}
			type="button"
			// The emoji alone announces as its unicode name ("thumbs up"); pairing it with the count
			// is what makes the pill's state legible to a screen reader.
			aria-label={`${emoji} ${count}`}
			aria-pressed={active}
			onClick={onClick}
		>
			<span className="tlui-cmt-reaction__emoji">{emoji}</span>
			<span className="tlui-cmt-reaction__count">{count}</span>
		</button>
	)
}
