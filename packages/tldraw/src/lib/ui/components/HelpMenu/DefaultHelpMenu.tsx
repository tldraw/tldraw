import { memo } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import { Button } from '../primitives/Button'
import { Dropdown, DropdownContent, DropdownTrigger } from '../primitives/DropdownMenu'
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

	if (breakpoint < 4) return null

	return (
		<div className="tlui-help-menu">
			<Dropdown id="help menu">
				<DropdownTrigger>
					<Button type="help" smallIcon title={msg('help-menu.title')} icon="question-mark" />
				</DropdownTrigger>
				<DropdownContent side="top" align="end" alignOffset={0} sideOffset={8}>
					<TldrawUiMenuContextProvider type="menu" sourceId="help-menu">
						{content}
					</TldrawUiMenuContextProvider>
				</DropdownContent>
			</Dropdown>
		</div>
	)
})
