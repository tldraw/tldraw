import { ReactNode, memo, useCallback } from 'react'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { COMMAND_PALETTE_MENU_ID } from './commandPaletteMenuId'
import { CommandPaletteShell, TLUiCommandPalettePosition } from './CommandPaletteShell'
import { DefaultCommandPaletteContent } from './DefaultCommandPaletteContent'

/** @public */
export interface TLUiCommandPaletteProps {
	/** Where the palette opens. Defaults to `'bottom'`, just above the toolbar. */
	position?: TLUiCommandPalettePosition
	children?: ReactNode
}

/** @public @react */
export const DefaultCommandPalette = memo(function DefaultCommandPalette({
	position,
	children,
}: TLUiCommandPaletteProps) {
	const [isOpen, onOpenChange] = useMenuIsOpen(COMMAND_PALETTE_MENU_ID)
	const close = useCallback(() => onOpenChange(false), [onOpenChange])
	if (!isOpen) return null

	return (
		<CommandPaletteShell position={position} onClose={close}>
			{children ?? <DefaultCommandPaletteContent />}
		</CommandPaletteShell>
	)
})
