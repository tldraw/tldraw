import {
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	useEditor,
	useMenuIsOpen,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './menu-system-hover.css'

// [1]
function HoverControlledMenu() {
	const editor = useEditor()
	const [isOpen] = useMenuIsOpen('hover-menu')

	return (
		<div className="hover-menu-container">
			{/* [2] */}
			<div
				className="hover-zone hover-zone-open"
				onMouseEnter={() => editor.menus.addOpenMenu('hover-menu')}
			>
				Hover to open menu
			</div>

			{/* [3] */}
			<div
				className="hover-zone hover-zone-close"
				onMouseEnter={() => editor.menus.deleteOpenMenu('hover-menu')}
			>
				Hover to close menu
			</div>

			{/* [4] */}
			<TldrawUiDropdownMenuRoot id="hover-menu">
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="normal">
						<TldrawUiButtonLabel>Menu {isOpen ? '(open)' : '(closed)'}</TldrawUiButtonLabel>
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent>
					<TldrawUiDropdownMenuItem>
						<TldrawUiButton type="menu">
							<TldrawUiButtonLabel>Menu item 1</TldrawUiButtonLabel>
						</TldrawUiButton>
					</TldrawUiDropdownMenuItem>
					<TldrawUiDropdownMenuItem>
						<TldrawUiButton type="menu">
							<TldrawUiButtonLabel>Menu item 2</TldrawUiButtonLabel>
						</TldrawUiButton>
					</TldrawUiDropdownMenuItem>
					<TldrawUiDropdownMenuItem>
						<TldrawUiButton type="menu">
							<TldrawUiButtonLabel>Menu item 3</TldrawUiButtonLabel>
						</TldrawUiButton>
					</TldrawUiDropdownMenuItem>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
}

export default function MenuSystemHoverExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{
					InFrontOfTheCanvas: HoverControlledMenu,
				}}
			/>
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
TldrawUiDropdownMenuRoot will automatically respond to this state change.

[3]
The second hover zone calls editor.menus.deleteOpenMenu('hover-menu') on mouse
enter, which closes the menu.

[4]
The TldrawUiDropdownMenuRoot is linked to our menu ID ('hover-menu'). It
automatically syncs with the menu tracking system, so when we call addOpenMenu
or deleteOpenMenu, the dropdown responds accordingly. You can also click the
trigger button to toggle the menu normally.
*/
