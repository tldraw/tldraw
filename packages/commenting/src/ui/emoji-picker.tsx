/**
 * The emoji offered by the add-reaction picker out of the box. A short, opinionated set rather
 * than a full emoji keyboard: the picker is a quick affordance under a comment, and a searchable
 * keyboard is a much larger component. Pass `emoji` to `ReactionPicker` to substitute your own.
 *
 * @public
 */
export const DEFAULT_REACTION_EMOJI = ['👍', '👎', '❤️', '🎉', '😄', '😮', '😢', '🙏', '👀', '🔥']

/** @public */
export interface EmojiPickerProps {
	/** The emoji to offer. Defaults to `DEFAULT_REACTION_EMOJI`. */
	emoji?: string[]
	/** Emoji the current user has already reacted with; shown as pressed. */
	selected?: string[]
	/** Called when an emoji is chosen. */
	onSelect?(emoji: string): void
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
						{value}
					</button>
				)
			})}
		</div>
	)
}
