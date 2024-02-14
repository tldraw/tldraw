import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiMenuContextProvider } from '../menus/TldrawUiMenuContext'
import { Button } from '../primitives/Button'
import { DefaultHelpMenuContent } from './DefaultHelpMenuContent'

/** @public */
export type TLUiHelpMenuProps = {
	children?: any
}

/** @public */
export const DefaultHelpMenu = memo(function DefaultHelpMenu({ children }: TLUiHelpMenuProps) {
	const container = useContainer()
	const msg = useTranslation()
	const breakpoint = useBreakpoint()
	const [isOpen, onOpenChange] = useMenuIsOpen('help menu')

	// Get the help menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const content = children ?? <DefaultHelpMenuContent />
	if (!content) return null

	if (breakpoint < 4) return null

	return (
		<div className="tlui-help-menu">
			<_Dropdown.Root dir="ltr" open={isOpen} onOpenChange={onOpenChange} modal={false}>
				<_Dropdown.Trigger asChild dir="ltr">
					<Button
						type="help"
						className="tlui-button"
						smallIcon
						title={msg('help-menu.title')}
						icon="question-mark"
					/>
				</_Dropdown.Trigger>
				<_Dropdown.Portal container={container}>
					<_Dropdown.Content
						className="tlui-menu"
						side="top"
						sideOffset={8}
						align="end"
						alignOffset={0}
						collisionPadding={4}
					>
						<TldrawUiMenuContextProvider type="menu" sourceId="help-menu">
							{content}
						</TldrawUiMenuContextProvider>
					</_Dropdown.Content>
				</_Dropdown.Portal>
			</_Dropdown.Root>
		</div>
	)
})
