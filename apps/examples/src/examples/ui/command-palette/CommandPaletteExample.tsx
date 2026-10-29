import {
	CommandPaletteActionGroup,
	DefaultCommandPalette,
	DefaultColorStyle,
	DefaultCommandPaletteContent,
	TLComponents,
	TLUiCommandPaletteProps,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useToasts,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const overrides: TLUiOverrides = {
	actions(editor, actions) {
		actions['make-red'] = {
			id: 'make-red',
			label: 'Make red',
			isEnabled: (editor) => editor.getSelectedShapeIds().length > 0,
			commandPalette: { group: 'colors' },
			onSelect() {
				editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
			},
		}
		return actions
	},
}

// [2]
function CustomCommandPalette(props: TLUiCommandPaletteProps) {
	const { addToast } = useToasts()
	return (
		<DefaultCommandPalette {...props} position="top">
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
		</DefaultCommandPalette>
	)
}

const components: TLComponents = {
	CommandPalette: CustomCommandPalette,
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
Actions are listed in the palette on their own. The palette hides disabled actions, so "Make red"
only shows up while something is selected. Left alone, it would land in the catch-all at the end
of the default content. `commandPalette: { group }` lists it in the `CommandPaletteActionGroup`
with that group below instead, and `commandPalette: false` leaves it out of the palette.

[2]
Wrap `DefaultCommandPalette` and keep `DefaultCommandPaletteContent` to add commands without
rebuilding the palette. Items are the same `TldrawUiMenu*` components the other menus use.
Forward the slot's props so the palette keeps anything tldraw passes to the slot.

`position` sets where the palette opens: `'center'`, the default, `'top'`, or `'bottom'`, just
above the toolbar.

[3]
A submenu is one row you open to see its items. Its items still show up when you search, so
typing "goodbye" finds "Say goodbye" without opening "Greetings" first.
*/
