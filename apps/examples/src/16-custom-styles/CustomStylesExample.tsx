import { TLUiMenuGroup, Tldraw, menuItem, toolbarItem, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { TLUiOverrides } from '@tldraw/ui/src/lib/overrides'
import { track } from 'signia-react'
import { CardShape, MyFilterStyle } from './CardShape'

const shapes = [CardShape]

export default function CustomStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				persistenceKey="custom-styles-example"
				shapes={shapes}
				overrides={cardToolMenuItems}
			>
				<FilterStyleUi />
			</Tldraw>
		</div>
	)
}

const FilterStyleUi = track(function FilterStyleUi() {
	const editor = useEditor()
	const filterStyle = editor.sharedStyles.get(MyFilterStyle)

	// if the filter style isn't in sharedStyles, it means it's not relevant to the current tool/selection
	if (!filterStyle) return null

	return (
		<div style={{ position: 'absolute', zIndex: 300, top: 64, left: 12 }}>
			filter:{' '}
			<select
				value={filterStyle.type === 'mixed' ? 'mixed' : filterStyle.value}
				onChange={(e) => editor.setStyle(MyFilterStyle, e.target.value)}
			>
				<option value="mixed" disabled>
					Mixed
				</option>
				<option value="none">None</option>
				<option value="invert">Invert</option>
				<option value="grayscale">Grayscale</option>
				<option value="blur">Blur</option>
			</select>
		</div>
	)
})

const cardToolMenuItems: TLUiOverrides = {
	// In order for our custom tool to show up in the UI...
	// We need to add it to the tools list. This "toolItem"
	// has information about its icon, label, keyboard shortcut,
	// and what to do when it's selected.
	tools(editor, tools) {
		tools.card = {
			id: 'card',
			icon: 'color',
			label: 'Card' as any,
			kbd: 'c',
			readonlyOk: false,
			onSelect: () => {
				editor.setSelectedTool('card')
			},
		}
		return tools
	},
	toolbar(_app, toolbar, { tools }) {
		// The toolbar is an array of items. We can add it to the
		// end of the array or splice it in, then return the array.
		toolbar.splice(4, 0, toolbarItem(tools.card))
		return toolbar
	},
	keyboardShortcutsMenu(_app, keyboardShortcutsMenu, { tools }) {
		// Same for the keyboard shortcuts menu, but this menu contains
		// both items and groups. We want to find the "Tools" group and
		// add it to that before returning the array.
		const toolsGroup = keyboardShortcutsMenu.find(
			(group) => group.id === 'shortcuts-dialog.tools'
		) as TLUiMenuGroup
		toolsGroup.children.push(menuItem(tools.card))
		return keyboardShortcutsMenu
	},
}
