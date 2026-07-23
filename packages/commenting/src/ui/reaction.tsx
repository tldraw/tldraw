import { ReactNode } from 'react'
import {
	TldrawUiHoverCard,
	TldrawUiHoverCardContent,
	TldrawUiHoverCardTrigger,
	useTranslation,
} from 'tldraw'
import { ReactionReactor } from './reactions'

/** Render a reaction token to its visual — the emoji glyph by default. @public */
export type RenderReaction = (token: string) => ReactNode

/** The default reaction renderer: emits the token string for the OS emoji font to draw. @public */
export function defaultRenderReaction(token: string): ReactNode {
	return token
}

/** @public */
export interface ReactionProps {
	emoji: string
	count: number
	active: boolean
	/** How to draw the emoji token. Defaults to the token string (OS emoji font). */
	renderReaction?: RenderReaction
	/** Who reacted with this emoji, in reaction order — shown when the pill is hovered. */
	reactors: ReactionReactor[]
	/** Whether the current user is listed among the reactors on hover. When false, the list shows
	 *  only other people. Either way, a reaction only the current user made shows no list at all.
	 *  Defaults to true. */
	showSelf?: boolean
	/** Whether hovering shows the reactor list. Pass false to suppress it — e.g. while another
	 *  popup menu on the comment is open. Defaults to true. */
	enableHoverList?: boolean
	/** Called when the pill is pressed — toggles the current user's reaction. */
	onClick?(): void
}

/**
 * A single emoji reaction pill with a count, highlighted when the user reacted. Hovering it lists
 * who reacted — but only when someone other than the current user reacted (a reaction only you made
 * shows no list), and only when `enableHoverList` is set.
 * @public @react
 */
export function Reaction({
	emoji,
	count,
	active,
	reactors,
	showSelf = true,
	enableHoverList = true,
	renderReaction = defaultRenderReaction,
	onClick,
}: ReactionProps) {
	const msg = useTranslation()
	// The list appears only when someone other than the current user reacted; `showSelf` then
	// decides whether the current user is listed alongside them.
	const hasOthers = reactors.some((reactor) => !reactor.you)
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
			<span className="tlui-cmt-reaction__emoji">{renderReaction(emoji)}</span>
			<span className="tlui-cmt-reaction__count">{count}</span>
		</button>
	)

	// A bare pill when there's no one else to list, or when hovering is suppressed.
	if (!enableHoverList || !hasOthers) return pill

	return (
		// A short open delay so the reactor list feels responsive on hover, rather than the
		// tooltip-length default.
		<TldrawUiHoverCard openDelay={300}>
			<TldrawUiHoverCardTrigger>{pill}</TldrawUiHoverCardTrigger>
			<TldrawUiHoverCardContent side="bottom" className="tlui-cmt-reactors">
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
