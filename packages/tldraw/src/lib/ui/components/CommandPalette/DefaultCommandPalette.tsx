import { useEditor } from '@tldraw/editor'
import { ReactNode, memo, useCallback, useEffect } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { COMMAND_PALETTE_MENU_ID, useCommandPaletteMountRegistration } from './commandPaletteMount'
import { CommandPaletteShell } from './CommandPaletteShell'
import { DefaultCommandPaletteContent } from './DefaultCommandPaletteContent'

/** @public */
export interface TLUiCommandPaletteProps {
	children?: ReactNode
}

/** @public @react */
export const DefaultCommandPalette = memo(function DefaultCommandPalette({
	children,
}: TLUiCommandPaletteProps) {
	const editor = useEditor()
	const [isOpen, onOpenChange] = useMenuIsOpen(COMMAND_PALETTE_MENU_ID)
	useCommandPaletteMountRegistration()

	// The action opens the palette through editor.menus directly, which the hook's unmount cleanup
	// doesn't track; unmounting while open would otherwise leave every shortcut disabled.
	useEffect(() => () => editor.menus.deleteOpenMenu(COMMAND_PALETTE_MENU_ID), [editor])

	const close = useCallback(() => onOpenChange(false), [onOpenChange])
	if (!isOpen) return null

	return (
		<CommandPaletteShell onClose={close}>
			{children ?? <DefaultCommandPaletteContent />}
		</CommandPaletteShell>
	)
})
