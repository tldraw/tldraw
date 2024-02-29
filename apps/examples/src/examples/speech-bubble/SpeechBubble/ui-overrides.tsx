import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	TldrawUiMenuItem,
	toolbarItem,
	useTools,
} from 'tldraw'

// There's a guide at the bottom of this file!

// [1]
export const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.speech = {
			id: 'speech-bubble',
			icon: 'speech-bubble',
			label: 'Speech Bubble',
			kbd: 's',
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
}

// [2]

export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'speech-bubble': '/speech-bubble.svg',
	},
}

export const components: TLComponents = {
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['speech']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools
to the toolbar and the keyboard shortcuts menu.

[1]
Here we add our custom tool to the toolbar. We do this by providing a custom
toolbar override to the Tldraw component. This override is a function that takes
the current editor, the default toolbar items, and the default tools. It returns
the new toolbar items. We use the toolbarItem helper to create a new toolbar item
for our custom tool. We then splice it into the toolbar items array at the 4th index.
This puts it after the eraser tool. We'll pass our overrides object into the 
Tldraw component's `overrides` prop.

[2]
Our toolbar item is using a custom icon, so we need to provide the asset url for it. 
We do this by providing a custom assetUrls object to the Tldraw component. 
This object is a map of icon ids to their urls. The icon ids are the same as the 
icon prop on the toolbar item. We'll pass our assetUrls object into the Tldraw
component's `assetUrls` prop.

*/
