import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	TldrawUiMenuItem,
	useIsToolSelected,
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
}

// [2]
export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'speech-bubble': '/speech-bubble.svg',
	},
}

export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSpeechBubbleSelected = useIsToolSelected(tools['speech'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['speech']} isSelected={isSpeechBubbleSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['speech']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools
to the toolbar and the keyboard shortcuts menu.

[1]
Here we add our new tool to the UI's tools object in the tools override. This is where we define
all the basic information about our new tool - its icon, label, keyboard shortcut, what happens when
we select it, etc.


[2]
Our toolbar item is using a custom icon, so we need to provide the asset url for it. 
We do this by providing a custom assetUrls object to the Tldraw component. 
This object is a map of icon ids to their urls. The icon ids are the same as the 
icon prop on the toolbar item. We'll pass our assetUrls object into the Tldraw
component's `assetUrls` prop.

[3]
We replace the UI components for the toolbar and keyboard shortcut dialog with our own, that
add our new tool to the existing default content. Ideally, we'd interleave our new tool into the
ideal place among the default tools, but for now we're just adding it at the start to keep things
simple.

*/
