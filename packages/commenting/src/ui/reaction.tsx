import {
	TldrawUiHoverCard,
	TldrawUiHoverCardContent,
	TldrawUiHoverCardTrigger,
	useTranslation,
} from 'tldraw'
import { ReactionReactor } from './reactions'

/** @public */
export interface ReactionProps {
	emoji: string
	count: number
	active: boolean
	/** Who reacted with this emoji, in reaction order — shown when the pill is hovered. */
	reactors: ReactionReactor[]
	/** Whether the current user is listed among the reactors on hover. When false and the current
	 *  user is the only reactor, no hover list is shown. Defaults to true. */
	showSelf?: boolean
	/** Called when the pill is pressed — toggles the current user's reaction. */
	onClick?(): void
}

/**
 * A single emoji reaction pill with a count, highlighted when the user reacted. Hovering it lists
 * who reacted; the list is omitted when there'd be nobody to show (see `showSelf`).
 * @public @react
 */
export function Reaction({
	emoji,
	count,
	active,
	reactors,
	showSelf = true,
	onClick,
}: ReactionProps) {
	const msg = useTranslation()
	const shown = showSelf ? reactors : reactors.filter((reactor) => !reactor.you)

	const pill = (
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

	// Nobody to show (e.g. showSelf is off and only the current user reacted) — a bare pill, no card.
	if (shown.length === 0) return pill

	return (
		<TldrawUiHoverCard>
			<TldrawUiHoverCardTrigger>{pill}</TldrawUiHoverCardTrigger>
			<TldrawUiHoverCardContent side="top" className="tlui-cmt-reactors">
				<ul className="tlui-cmt-reactors__list" role="list">
					{shown.map((reactor, i) => (
						<li key={i} className="tlui-cmt-reactors__item">
							{reactor.you ? msg('comments.mention-you') : reactor.name}
						</li>
					))}
				</ul>
			</TldrawUiHoverCardContent>
		</TldrawUiHoverCard>
	)
}
