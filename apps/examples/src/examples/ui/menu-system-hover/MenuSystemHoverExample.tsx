import {
	TlButton,
	TlButtonLabel,
	TlDropdownMenuContent,
	TlDropdownMenuItem,
	TlDropdownMenuRoot,
	TlDropdownMenuTrigger,
	useTlMenuIsOpen,
	useTlMenuState,
} from '@tldraw/ui'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ExampleTlUiProvider } from '../../../misc/ExampleTlUiProvider'
import './menu-system-hover.css'

// [1]
function HoverControlledMenu() {
	const { openMenu, closeMenu } = useTlMenuState()
	const [isOpen] = useTlMenuIsOpen('hover-menu')

	return (
		<div className="hover-menu-container">
			{/* [2] */}
			<div className="hover-zone hover-zone-open" onMouseEnter={() => openMenu('hover-menu')}>
				Hover to open menu
			</div>

			{/* [3] */}
			<div className="hover-zone hover-zone-close" onMouseEnter={() => closeMenu('hover-menu')}>
				Hover to close menu
			</div>

			{/* [4] */}
			<TlDropdownMenuRoot id="hover-menu">
				<TlDropdownMenuTrigger>
					<TlButton type="normal">
						<TlButtonLabel>Menu {isOpen ? '(open)' : '(closed)'}</TlButtonLabel>
					</TlButton>
				</TlDropdownMenuTrigger>
				<TlDropdownMenuContent>
					<TlDropdownMenuItem>
						<TlButton type="menu">
							<TlButtonLabel>Menu item 1</TlButtonLabel>
						</TlButton>
					</TlDropdownMenuItem>
					<TlDropdownMenuItem>
						<TlButton type="menu">
							<TlButtonLabel>Menu item 2</TlButtonLabel>
						</TlButton>
					</TlDropdownMenuItem>
					<TlDropdownMenuItem>
						<TlButton type="menu">
							<TlButtonLabel>Menu item 3</TlButtonLabel>
						</TlButton>
					</TlDropdownMenuItem>
				</TlDropdownMenuContent>
			</TlDropdownMenuRoot>
		</div>
	)
}

export default function MenuSystemHoverExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<ExampleTlUiProvider>
					<HoverControlledMenu />
				</ExampleTlUiProvider>
			</Tldraw>
		</div>
	)
}

/*
This example shows how to programmatically control menus using hover events.

[1]
The HoverControlledMenu component uses useMenuIsOpen to track the current state
of our menu. The hook returns a tuple where the first element is a boolean
indicating whether the menu is open.

[2]
The first hover zone calls editor.menus.addOpenMenu('hover-menu') on mouse enter.
This registers the menu as open in the global menu tracking system. The
TlDropdownMenuRoot will automatically respond to this state change.

[3]
The second hover zone calls editor.menus.deleteOpenMenu('hover-menu') on mouse
enter, which closes the menu.

[4]
The TlDropdownMenuRoot is linked to our menu ID ('hover-menu'). It
automatically syncs with the menu tracking system, so when we call addOpenMenu
or deleteOpenMenu, the dropdown responds accordingly. You can also click the
trigger button to toggle the menu normally.
*/
