import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import tunnel from '../../../tunnel'
import { Button } from '../../primitives/Button'
import { TldrawUiMenuContextProvider } from '../MenuItems/TldrawUiMenuContext'
import { DefaultMainMenu } from './DefaultMainMenu'

const _MainMenuContent = tunnel(<DefaultMainMenu />)

/** @public */
export const CustomMainMenu = _MainMenuContent.In

/** @public */
export const MainMenu = memo(function MainMenu() {
	const container = useContainer()
	const [isOpen, onOpenChange] = useMenuIsOpen('main menu')
	const msg = useTranslation()

	return (
		<_Dropdown.Root dir="ltr" open={isOpen} onOpenChange={onOpenChange} modal={false}>
			<_Dropdown.Trigger asChild dir="ltr">
				<Button
					type="icon"
					className="tlui-menu__trigger"
					data-testid="main.menu"
					title={msg('menu.title')}
					icon="menu"
					smallIcon
				/>
			</_Dropdown.Trigger>
			<_Dropdown.Portal container={container}>
				<_Dropdown.Content
					className="tlui-menu"
					side="bottom"
					align="start"
					collisionPadding={4}
					alignOffset={0}
					sideOffset={6}
				>
					<TldrawUiMenuContextProvider type="menu" sourceId="menu">
						<_MainMenuContent.Out />
					</TldrawUiMenuContextProvider>
				</_Dropdown.Content>
			</_Dropdown.Portal>
		</_Dropdown.Root>
	)
})
