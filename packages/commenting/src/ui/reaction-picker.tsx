import { useId } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useTranslation,
} from 'tldraw'
import { EmojiPicker } from './emoji-picker'

/** @public */
export interface ReactionPickerProps {
	/** The emoji to offer. Defaults to `DEFAULT_REACTION_EMOJI`. */
	emoji?: string[]
	/** Emoji the current user has already reacted with; shown as pressed in the grid. */
	selected?: string[]
	/** Called when an emoji is chosen. */
	onSelect?(emoji: string): void
	/**
	 * Identifies the menu in tldraw's global menu registry, which keys open/closed state by id.
	 * A thread renders one picker per comment, so this must differ per comment — sharing an id
	 * makes every picker in the thread open at once. Defaults to a per-instance generated id;
	 * pass one only for a stabler, more debuggable value.
	 */
	menuId?: string
	/** Class for the trigger button. Defaults to the card-action style, matching the ⋯ button. */
	className?: string
}

/**
 * The add-reaction affordance: a smiley button that opens an emoji grid.
 *
 * Anchored to its own button rather than to the reactions row, so the menu keeps its position as
 * reactions are added and the row reflows.
 * @public @react
 */
export function ReactionPicker({
	emoji,
	selected,
	onSelect,
	menuId,
	className = 'tlui-cmt-thread__action',
}: ReactionPickerProps) {
	const msg = useTranslation()
	// Unique per mounted picker unless the host supplies something stabler — see `menuId`.
	const generatedId = useId()
	return (
		<TldrawUiDropdownMenuRoot id={menuId ?? `comment-reactions-${generatedId}`}>
			<TldrawUiDropdownMenuTrigger>
				<button
					type="button"
					className={className}
					title={msg('comments.add-reaction')}
					aria-label={msg('comments.add-reaction')}
				>
					<SmileyIcon />
				</button>
			</TldrawUiDropdownMenuTrigger>
			{/* right-aligned under the trigger, so the grid hangs down the card's right edge */}
			<TldrawUiDropdownMenuContent side="bottom" align="end">
				<EmojiPicker emoji={emoji} selected={selected} onSelect={onSelect} />
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}

function SmileyIcon() {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.3"
			aria-hidden="true"
		>
			<circle cx="8" cy="8" r="6.1" />
			<path d="M5.4 9.3a3.1 3.1 0 0 0 5.2 0" strokeLinecap="round" />
			<circle cx="5.9" cy="6.4" r="0.85" fill="currentColor" stroke="none" />
			<circle cx="10.1" cy="6.4" r="0.85" fill="currentColor" stroke="none" />
		</svg>
	)
}
