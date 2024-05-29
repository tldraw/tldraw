import { ReactNode, memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import { DefaultHelpMenuContent } from './DefaultHelpMenuContent'

/** @public */
export interface TLUiHelpMenuProps {
	children?: ReactNode
}

/** @public */
export const DefaultHelpMenu = memo(function DefaultHelpMenu({ children }: TLUiHelpMenuProps) {
	const msg = useTranslation()
	const breakpoint = useBreakpoint()

	// Get the help menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultHelpMenuContent />

	if (breakpoint < PORTRAIT_BREAKPOINT.MOBILE) return null

	return (
		<div className="tlui-help-menu">
			<TldrawUiDropdownMenuRoot id="help menu">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="help" title={msg('help-menu.title')} data-testid="help-menu.button">
						<TldrawUiButtonIcon icon="question-mark" small />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="top" align="end" alignOffset={0} sideOffset={8}>
					<TldrawUiMenuContextProvider type="menu" sourceId="help-menu">
						{content}
					</TldrawUiMenuContextProvider>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
})
