import {
	DefaultCommandPalette,
	DefaultColorStyle,
	DefaultCommandPaletteContent,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
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
			onSelect() {
				editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')
			},
		}
		return actions
	},
}

// [2]
function CustomCommandPalette() {
	const { addToast } = useToasts()
	return (
		<DefaultCommandPalette>
			<TldrawUiMenuGroup id="colors" label="Colors">
				<TldrawUiMenuActionItem actionId="make-red" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="example" label="Example">
				<TldrawUiMenuItem
					id="say-hello"
					label="Say hello"
					onSelect={() => {
						addToast({ title: 'Hello!' })
					}}
				/>
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
Actions are listed in the palette on their own, gated by `isEnabled` like everywhere else, so
"Make red" only shows up while something is selected. Left alone, it would land in the catch-all
at the end of the default content; placing it in a group below takes it out of there.

[2]
Wrap `DefaultCommandPalette` and keep `DefaultCommandPaletteContent` to add commands without
rebuilding the palette. Items are the same `TldrawUiMenu*` components the other menus use.
*/
