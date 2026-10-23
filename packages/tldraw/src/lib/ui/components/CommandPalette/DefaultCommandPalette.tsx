import { ReactNode, memo, useCallback } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { COMMAND_PALETTE_MENU_ID } from './commandPaletteMenuId'
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
	const [isOpen, onOpenChange] = useMenuIsOpen(COMMAND_PALETTE_MENU_ID)
	const close = useCallback(() => onOpenChange(false), [onOpenChange])
	if (!isOpen) return null

	return (
		<CommandPaletteShell onClose={close}>
			{children ?? <DefaultCommandPaletteContent />}
		</CommandPaletteShell>
	)
})
