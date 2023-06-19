import {
	TLUiMenuGroup,
	TLUiOverrides,
	Tldraw,
	defineShape,
	menuItem,
	toolbarItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { CardShapeTool } from './CardShapeTool'
import { CardShapeUtil } from './CardShapeUtil'

export const CustomCardShape = defineShape('card', {
	util: CardShapeUtil,
	tool: CardShapeTool,
})

const myCustomShapes = [CustomCardShape]

const myUiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
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
		// Add the tool item from the context to the toolbar.
		toolbar.splice(4, 0, toolbarItem(tools.card))
		return toolbar
	},
	keyboardShortcutsMenu(_app, keyboardShortcutsMenu, { tools }) {
		// Add the tool item from the context to the keyboard shortcuts dialog.
		const toolsGroup = keyboardShortcutsMenu.find(
			(group) => group.id === 'shortcuts-dialog.tools'
		) as TLUiMenuGroup
		toolsGroup.children.push(menuItem(tools.card))
		return keyboardShortcutsMenu
	},
}

export default function CustomConfigExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus shapes={myCustomShapes} overrides={myUiOverrides} />
		</div>
	)
}
