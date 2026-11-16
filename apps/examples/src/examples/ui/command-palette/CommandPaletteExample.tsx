import {
	CommandPalette,
	CommandPaletteActionGroup,
	CommandPaletteMenuItem,
	commandPaletteOverrides,
	DefaultCommandPaletteContent,
} from '@tldraw/command-palette'
import {
	DefaultColorStyle,
	DefaultMainMenu,
	DefaultMainMenuContent,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useToasts,
} from 'tldraw'
import '@tldraw/command-palette/command-palette.css'
import 'tldraw/tldraw.css'

// [1]
const overrides: TLUiOverrides[] = [
	commandPaletteOverrides,
	{
		actions(editor, actions) {
			actions['make-red'] = {
				id: 'make-red',
				label: 'Make red',
				isEnabled: (editor) => editor.getSelectedShapeIds().length > 0,
				onSelect() {
					editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
				},
			}
			return actions
		},
	},
]

// [2]
function CustomCommandPalette() {
	const { addToast } = useToasts()
	return (
		<CommandPalette position="top" actionGroups={{ 'make-red': 'colors' }}>
			<CommandPaletteActionGroup group="colors" label="Colors" />
			{/* [3] */}
			<TldrawUiMenuGroup id="example" label="Example">
				<TldrawUiMenuSubmenu id="greetings" label="Greetings">
					<TldrawUiMenuGroup id="greetings-items">
						<TldrawUiMenuItem
							id="say-hello"
							label="Say hello"
							onSelect={() => {
								addToast({ title: 'Hello!' })
							}}
						/>
						<TldrawUiMenuItem
							id="say-goodbye"
							label="Say goodbye"
							onSelect={() => {
								addToast({ title: 'Goodbye!' })
							}}
						/>
					</TldrawUiMenuGroup>
				</TldrawUiMenuSubmenu>
			</TldrawUiMenuGroup>
			<DefaultCommandPaletteContent />
		</CommandPalette>
	)
}

// [4]
function CustomMainMenu() {
	return (
		<DefaultMainMenu>
			<DefaultMainMenuContent />
			<TldrawUiMenuGroup id="command-palette">
				<CommandPaletteMenuItem />
			</TldrawUiMenuGroup>
		</DefaultMainMenu>
	)
}

const components: TLComponents = {
	CommandPalette: CustomCommandPalette,
	MainMenu: CustomMainMenu,
}

export default function CommandPaletteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} overrides={overrides} />
		</div>
	)
}

/*
[1]
`commandPaletteOverrides` adds the `open-command-palette` action, which Cmd/Ctrl+K runs. Actions
are listed in the palette on their own. "Make red" is disabled with nothing selected: browsing
leaves it out then, and search lists it greyed out.

[2]
`CommandPalette` goes in the `CommandPalette` slot and renders the palette while it's open. Wrap it
to pass props. Children replace the default content, so keep `DefaultCommandPaletteContent` to add
commands without rebuilding the palette. Items are the same `TldrawUiMenu*` components the other
menus use.

`actionGroups` places actions: "make-red" goes to the `CommandPaletteActionGroup` with the
"colors" group instead of the catch-all at the end of the default content. `false` leaves an
action out of the palette.

`position` sets where the palette opens: `'bottom'`, the default, just above the toolbar,
`'center'`, or `'top'`.

[3]
A submenu is one row you open to see its items. Its items still show up when you search, so
typing "goodbye" finds "Say goodbye" without opening "Greetings" first.

[4]
`CommandPaletteMenuItem` opens the palette from a menu, here the main menu.
*/
