import { useEditor, useValue } from '@tldraw/editor'
import { ComponentType, ReactNode, memo, useCallback, useEffect } from 'react'
import { COMMAND_PALETTE_MENU_ID } from './commandPaletteMenuId'
import { CommandPaletteShell, TLUiCommandPaletteShellProps } from './CommandPaletteShell'
import { DefaultCommandPaletteContent } from './DefaultCommandPaletteContent'

/** @public */
export interface TLUiCommandPaletteProps extends Pick<
	TLUiCommandPaletteShellProps,
	'position' | 'suggestions'
> {
	/** Closes the palette. The `CommandPalette` slot is mounted only while the palette is open. */
	onClose?(): void
	/** Replaces {@link DefaultCommandPaletteContent}. */
	children?: ReactNode
}

function useCloseCommandPalette() {
	const editor = useEditor()
	return useCallback(() => editor.menus.deleteOpenMenu(COMMAND_PALETTE_MENU_ID), [editor])
}

/**
 * A {@link CommandPaletteShell} with {@link DefaultCommandPaletteContent}, or `children` instead.
 *
 * @public @react
 */
export const DefaultCommandPalette = memo(function DefaultCommandPalette({
	position,
	suggestions,
	onClose,
	children,
}: TLUiCommandPaletteProps) {
	// Wrappers that don't forward props still need a way to close.
	const close = useCloseCommandPalette()
	return (
		<CommandPaletteShell position={position} suggestions={suggestions} onClose={onClose ?? close}>
			{children ?? <DefaultCommandPaletteContent />}
		</CommandPaletteShell>
	)
})

/**
 * Mounts the `CommandPalette` slot while the palette is open. Clears the open mark if it unmounts
 * while open, so hiding the UI can't leave every shortcut disabled.
 *
 * @internal
 */
export function CommandPaletteSlot({
	component: CommandPalette,
}: {
	/** The `CommandPalette` slot's component. */
	component: ComponentType<TLUiCommandPaletteProps>
}) {
	const editor = useEditor()
	const isOpen = useValue(
		'command palette open',
		() => editor.menus.isMenuOpen(COMMAND_PALETTE_MENU_ID),
		[editor]
	)
	const close = useCloseCommandPalette()
	useEffect(() => close, [close])
	if (!isOpen) return null
	return <CommandPalette onClose={close} />
}
