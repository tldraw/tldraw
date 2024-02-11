import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { useMenuIsOpen } from '../../../hooks/useMenuIsOpen'
import { useTldrawUiComponents } from '../../../hooks/useTldrawUiComponents'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { Button } from '../../primitives/Button'
import { TldrawUiMenuContextProvider } from '../TldrawUiMenuContext'

/** @public */
export const DefaultMainMenu = memo(function DefaultMainMenu() {
	const container = useContainer()
	const [isOpen, onOpenChange] = useMenuIsOpen('main menu')
	const msg = useTranslation()

	// Get the main menu content, either the default component or the user's
	// override. If there's no menu content, then the user has set it to null,
	// so skip rendering the menu.
	const { MainMenuContent } = useTldrawUiComponents()
	if (!MainMenuContent) return null

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
						<MainMenuContent />
					</TldrawUiMenuContextProvider>
				</_Dropdown.Content>
			</_Dropdown.Portal>
		</_Dropdown.Root>
	)
})
