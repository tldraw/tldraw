import { ReactNode } from 'react'
import { TldrawUiTooltip, useTranslation } from 'tldraw'
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
	/** Whether hovering shows the reactor list. Pass false to suppress it — e.g. while another
	 *  popup menu on the comment is open. Defaults to true. */
	enableHoverList?: boolean
	/** Called when the pill is pressed — toggles the current user's reaction. */
	onClick?(): void
}

/**
 * A single emoji reaction pill with a count, highlighted when the user reacted. Hovering it shows a
 * tooltip naming who reacted (the current user included), when `enableHoverList` is set.
 * @public @react
 */
export function Reaction({
	emoji,
	count,
	active,
	reactors,
	enableHoverList = true,
	renderReaction = defaultRenderReaction,
	onClick,
}: ReactionProps) {
	const msg = useTranslation()

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

	// A bare pill when hovering is suppressed, or when there's no one to name.
	if (!enableHoverList || reactors.length === 0) return pill

	// The same tooltip the toolbar uses, hung below the pill, with an inline reactor sentence.
	return (
		<TldrawUiTooltip side="bottom" content={summarizeReactors(reactors, msg)}>
			{pill}
		</TldrawUiTooltip>
	)
}

/**
 * Builds the reactor tooltip line: up to three names spelled out, then "and N others" — e.g.
 * "You reacted", "You and Bo reacted", "You, Bo and Ada reacted", "You, Bo, Ada and 2 others
 * reacted". Grammar lives in the translation strings so each locale controls it.
 */
function summarizeReactors(reactors: ReactionReactor[], msg: (id: string) => string): string {
	const names = reactors.map((reactor) =>
		reactor.you ? msg('comments.mention-you') : reactor.name
	)
	const [a, b, c] = names
	switch (names.length) {
		case 1:
			return msg('comments.reacted-1').replace('{a}', a)
		case 2:
			return msg('comments.reacted-2').replace('{a}', a).replace('{b}', b)
		case 3:
			return msg('comments.reacted-3').replace('{a}', a).replace('{b}', b).replace('{c}', c)
		default: {
			const others = names.length - 3
			const template = others === 1 ? 'comments.reacted-more-one' : 'comments.reacted-more'
			return msg(template)
				.replace('{a}', a)
				.replace('{b}', b)
				.replace('{c}', c)
				.replace('{count}', String(others))
		}
	}
}
