import { TlButton } from '@tldraw/ui'
import { TlButtonIcon } from '@tldraw/ui'
import { TlDropdownMenuContent, TlDropdownMenuRoot, TlDropdownMenuTrigger } from '@tldraw/ui'
import { ReactNode, memo } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultMainMenuContent } from './DefaultMainMenuContent'

/** @public */
export interface TLUiMainMenuProps {
	children?: ReactNode
}

/** @public @react */
export const DefaultMainMenu = memo(function DefaultMainMenu({ children }: TLUiMainMenuProps) {
	const msg = useTranslation()

	// Get the main menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultMainMenuContent />

	return (
		<TlDropdownMenuRoot id="main menu" modal={false}>
			<TlDropdownMenuTrigger>
				<TlButton type="icon" data-testid="main-menu.button" title={msg('menu.title')}>
					<TlButtonIcon icon="menu" small />
				</TlButton>
			</TlDropdownMenuTrigger>
			<TlDropdownMenuContent
				side="bottom"
				align="start"
				collisionPadding={4}
				alignOffset={0}
				sideOffset={6}
			>
				<TldrawUiMenuContextProvider type="menu" sourceId="main-menu">
					{content}
				</TldrawUiMenuContextProvider>
			</TlDropdownMenuContent>
		</TlDropdownMenuRoot>
	)
})
