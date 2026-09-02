import { useCallback, useId, type ComponentType, type KeyboardEvent, type MouseEvent } from 'react'
import {
	TldrawUiButton,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	tlmenus,
	useMaybeEditor,
	useTranslation,
} from 'tldraw'
import { EmojiPicker, type EmojiPickerProps } from './emoji-picker'
import { SmileyIcon } from './icons'
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
	 * emoji. Swap it for any component taking the same props to offer something else entirely (the
	 * drawn reactions example replaces it with a canvas you draw in); the props are passed straight
	 * through either way.
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
 * Whether a palette pick asked to keep the palette open (shift held) for multi-select.
 * @internal
 */
export function isMultiSelectPick(event?: MouseEvent | KeyboardEvent): boolean {
	return !!event?.shiftKey
}

/**
 * The add-reaction affordance: a smiley button that opens an emoji grid.
 *
 * Anchored to its own button rather than to the reactions row, so the menu keeps its position as
 * reactions are added and the row reflows.
 *
 * Picking an emoji dismisses the grid — adding and removing alike, since either way the picker has
 * done its job — and hands focus back to the trigger. Shift-picking keeps the grid open, for
 * choosing several reactions in a row.
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
	const editor = useMaybeEditor()
	// Unique per mounted picker unless the host supplies something stabler — see `menuId`.
	const generatedId = useId()
	const id = menuId ?? `comment-reactions-${generatedId}`

	// The dropdown's open state lives in tldraw's global menu registry, so dropping the entry is
	// what closes it. The palette's tokens are plain buttons — a swappable component, not radix
	// menu items — so nothing dismisses the menu on its own.
	const handleSelect = useCallback(
		(value: string, event?: MouseEvent | KeyboardEvent) => {
			onSelect?.(value)
			if (!isMultiSelectPick(event)) {
				tlmenus.deleteOpenMenu(id, editor?.contextId)
			}
		},
		[onSelect, id, editor]
	)

	return (
		<TldrawUiDropdownMenuRoot id={id}>
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton
					type="icon"
					tooltip={msg('comments.add-reaction')}
					title={msg('comments.add-reaction')}
					className={className}
				>
					<SmileyIcon />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			{/* left-aligned under the trigger, so the grid opens rightward off the card's edge */}
			<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={4}>
				<Palette
					emoji={emoji}
					selected={selected}
					onSelect={handleSelect}
					renderReaction={renderReaction}
				/>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
