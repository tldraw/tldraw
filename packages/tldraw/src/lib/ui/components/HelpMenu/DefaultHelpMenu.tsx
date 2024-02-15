import { memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import {
	DropdownMenuContent,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from '../primitives/DropdownMenu'
import { DefaultHelpMenuContent } from './DefaultHelpMenuContent'

/** @public */
export type TLUiHelpMenuProps = {
	children?: any
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
			<DropdownMenuRoot id="help menu">
				<DropdownMenuTrigger
					type="help"
					smallIcon
					title={msg('help-menu.title')}
					icon="question-mark"
				/>
				<DropdownMenuContent side="top" align="end" alignOffset={0} sideOffset={8}>
					<TldrawUiMenuContextProvider type="menu" sourceId="help-menu">
						{content}
					</TldrawUiMenuContextProvider>
				</DropdownMenuContent>
			</DropdownMenuRoot>
		</div>
	)
})
