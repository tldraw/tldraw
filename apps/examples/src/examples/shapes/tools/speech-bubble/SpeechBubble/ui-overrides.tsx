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
			label: 'Speech bubble',
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

// [3]
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
This file adds the speech bubble tool to the toolbar and the keyboard shortcuts dialog.

[1]
The `tools` override registers the tool item with the UI: its icon, label, keyboard shortcut,
and what happens when it's selected.

[2]
The tool item uses a custom icon, so we provide its url through the Tldraw component's
`assetUrls` prop. The key must match the `icon` on the tool item.

[3]
We replace the toolbar and keyboard shortcuts dialog with versions that render our tool item
alongside the default content. Here it's added at the start; you can place it anywhere among
the default items instead.
*/
