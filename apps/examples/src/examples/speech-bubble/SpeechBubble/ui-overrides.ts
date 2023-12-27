import {
	TLUiAssetUrlOverrides,
	TLUiMenuGroup,
	TLUiOverrides,
	menuItem,
	toolbarItem,
} from '@tldraw/tldraw'

export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.speech = {
			id: 'speech-bubble',
			//get rid of typescript error?
			icon: 'speech-bubble',
			label: 'Speech Bubble',
			kbd: 's',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('speech-bubble')
			},
		}
		return tools
	},
	toolbar(_app, toolbar, { tools }) {
		toolbar.splice(4, 0, toolbarItem(tools.speech))
		return toolbar
	},
	keyboardShortcutsMenu(_app, keyboardShortcutsMenu, { tools }) {
		const toolsGroup = keyboardShortcutsMenu.find(
			(group) => group.id === 'shortcuts-dialog.tools'
		) as TLUiMenuGroup
		toolsGroup.children.push(menuItem(tools.speech))
		return keyboardShortcutsMenu
	},
}

export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'speech-bubble': '/speech-bubble.svg',
	},
}
