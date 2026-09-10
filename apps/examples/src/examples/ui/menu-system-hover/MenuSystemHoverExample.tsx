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

// There's a guide at the bottom of this file!

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
			<Tldraw>
				<HoverControlledMenu />
			</Tldraw>
		</div>
	)
}

/*
tldraw tracks which menus are open in `editor.menus`, keyed by menu id. The dropdown
primitives read and write that state, so anything else that writes it can open or close
a menu too. Here two hover zones do exactly that.

[1]
`useMenuIsOpen(id)` returns `[isOpen, setIsOpen]` for a menu id and re-renders when the
state changes.

[2]
`editor.menus.addOpenMenu('hover-menu')` marks the menu as open. The dropdown with the
matching `id` responds by opening.

[3]
`editor.menus.deleteOpenMenu('hover-menu')` marks it closed again.

[4]
`TldrawUiDropdownMenuRoot` takes the same `id`, which is what links it to [2] and [3].
Clicking the trigger still toggles the menu the normal way.
*/
