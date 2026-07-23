import { useId, type ComponentType } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useTranslation,
} from 'tldraw'
import { EmojiPicker, type EmojiPickerProps } from './emoji-picker'
import { RenderReaction } from './reaction'

/** @public */
export interface ReactionPickerProps {
	/** The emoji to offer. Defaults to `DEFAULT_REACTION_EMOJI`. */
	emoji?: string[]
	/** Emoji the current user has already reacted with; shown as pressed in the grid. */
	selected?: string[]
	/** Called when an emoji is chosen. */
	onSelect?(emoji: string): void
	/** How to draw each emoji token. Defaults to the token string (OS emoji font). */
	renderReaction?: RenderReaction
	/**
	 * What the button opens — the thing that produces a token. Defaults to `EmojiPicker`, the grid of
	 * emoji. Swap it for any component taking the same props to offer something else entirely (see
	 * `DrawingReactionPalette`); the props are passed straight through either way.
	 */
	palette?: ComponentType<EmojiPickerProps>
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
	renderReaction,
	palette: Palette = EmojiPicker,
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
				<Palette
					emoji={emoji}
					selected={selected}
					onSelect={onSelect}
					renderReaction={renderReaction}
				/>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}

function SmileyIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
			<path
				d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82708 7.49972C1.82708 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82708 10.6327 1.82708 7.49972ZM5.03747 9.21395C4.87949 8.98746 4.56782 8.93193 4.34133 9.08991C4.11484 9.24789 4.05931 9.55956 4.21729 9.78605C4.93926 10.8211 6.14033 11.5 7.50004 11.5C8.85974 11.5 10.0608 10.8211 10.7828 9.78605C10.9408 9.55956 10.8852 9.24789 10.6587 9.08991C10.4323 8.93193 10.1206 8.98746 9.9626 9.21395C9.41963 9.99238 8.51907 10.5 7.50004 10.5C6.481 10.5 5.58044 9.99238 5.03747 9.21395ZM5.37503 6.84998C5.85828 6.84998 6.25003 6.45815 6.25003 5.97498C6.25003 5.4918 5.85828 5.09998 5.37503 5.09998C4.89179 5.09998 4.50003 5.4918 4.50003 5.97498C4.50003 6.45815 4.89179 6.84998 5.37503 6.84998ZM10.5 5.97498C10.5 6.45815 10.1083 6.84998 9.62503 6.84998C9.14179 6.84998 8.75003 6.45815 8.75003 5.97498C8.75003 5.4918 9.14179 5.09998 9.62503 5.09998C10.1083 5.09998 10.5 5.4918 10.5 5.97498Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	)
}
