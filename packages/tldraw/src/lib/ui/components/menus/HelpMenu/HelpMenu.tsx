import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import tunnel from '../../../tunnel'
import { Button } from '../../primitives/Button'
import { TldrawUiMenuContextProvider } from '../MenuItems/TldrawUiMenuContext'
import { DefaultHelpMenu } from './DefaultHelpMenu'

const _HelpMenuContent = tunnel(<DefaultHelpMenu />)

/** @public */
export const CustomHelpMenu = _HelpMenuContent.In

/** @public */
export const HelpMenu = memo(function HelpMenu() {
	const container = useContainer()
	const msg = useTranslation()
	const [isOpen, onOpenChange] = useMenuIsOpen('help menu')

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
							<_HelpMenuContent.Out />
						</TldrawUiMenuContextProvider>
					</_Dropdown.Content>
				</_Dropdown.Portal>
			</_Dropdown.Root>
		</div>
	)
})
