import { RenderReaction, defaultRenderReaction } from './reaction'

/**
 * The reaction emoji palette: the small, opinionated set the picker offers *and* the set a
 * reaction is allowed to use. It's deliberately short — a quick affordance under a comment, not a
 * full emoji keyboard — and it's the single source of truth for "which emoji may a reaction
 * carry". A reaction's `emoji` field is a free-form `string`, so this palette is what keeps it to
 * real, offered emoji; check membership with {@link isAllowedReactionEmoji}. Pass a custom `emoji`
 * array to `ReactionPicker` to offer a different set — validate against that same set if you do.
 *
 * @public
 */
export const DEFAULT_REACTION_EMOJI = ['👍', '👎', '❤️', '🎉', '😄', '😮', '😢', '🙏', '👀', '🔥']

/**
 * Whether `emoji` belongs to a reaction palette (defaults to {@link DEFAULT_REACTION_EMOJI}). Use
 * it to reject arbitrary strings before writing a reaction, so a scripted client can't spam a
 * comment with junk `emoji` values that the picker would never offer. Pass a custom `palette` to
 * match a customized picker.
 *
 * @public
 */
export function isAllowedReactionEmoji(
	emoji: string,
	palette: readonly string[] = DEFAULT_REACTION_EMOJI
): boolean {
	return palette.includes(emoji)
}

/** @public */
export interface EmojiPickerProps {
	/** The emoji to offer. Defaults to `DEFAULT_REACTION_EMOJI`. */
	emoji?: string[]
	/** Emoji the current user has already reacted with; shown as pressed. */
	selected?: string[]
	/** Called when an emoji is chosen. */
	onSelect?(emoji: string): void
	/** How to draw each emoji token. Defaults to the token string (OS emoji font). */
	renderReaction?: RenderReaction
}

/**
 * A grid of emoji to react with. Presentational and unpositioned — the host owns placement and
 * dismissal; `ReactionPicker` renders it in a dropdown under the add-reaction button.
 * @public @react
 */
export function EmojiPicker({
	emoji = DEFAULT_REACTION_EMOJI,
	selected,
	onSelect,
	renderReaction = defaultRenderReaction,
}: EmojiPickerProps) {
	return (
		<div className="tlui-cmt-emoji-picker" role="group">
			{emoji.map((value) => {
				const active = selected?.includes(value) ?? false
				return (
					<button
						key={value}
						type="button"
						className={
							active
								? 'tlui-cmt-emoji-picker__item tlui-cmt-emoji-picker__item--active'
								: 'tlui-cmt-emoji-picker__item'
						}
						aria-label={value}
						aria-pressed={active}
						onClick={() => onSelect?.(value)}
					>
						{renderReaction(value)}
					</button>
				)
			})}
		</div>
	)
}
