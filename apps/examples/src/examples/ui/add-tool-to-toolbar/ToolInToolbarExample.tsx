import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { StickerTool } from './sticker-tool-util'

// There's a guide at the bottom of this file!

// [1]
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.sticker = {
			id: 'sticker',
			icon: 'heart-icon',
			label: 'Sticker',
			kbd: 's',
			onSelect: () => {
				editor.setCurrentTool('sticker')
			},
		}
		return tools
	},
}

// [2]
const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isStickerSelected = useIsToolSelected(tools['sticker'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['sticker']} isSelected={isStickerSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	// [3]
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				{/* Ideally, we'd interleave this into the tools group */}
				<TldrawUiMenuItem {...tools['sticker']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

// [4]
export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'heart-icon': '/heart-icon.svg',
	},
}

// [5]
const customTools = [StickerTool]

export default function ToolInToolbarExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				initialState="sticker"
				overrides={uiOverrides}
				components={components}
				assetUrls={customAssetUrls}
			/>
		</div>
	)
}

/*
Introduction:
You can make an icon for your custom tool appear on tldraw's toolbar. To do this
you need to add the tool to the UI's tools context, override the toolbar
component, optionally add the tool to the keyboard shortcuts dialog, and pass in
an asset URL for its icon. For more information on how to implement custom
tools, check out the custom tool example.

[1]
The `tools` override adds a tool item to the UI's tools context. The item
describes how the tool appears in menus (icon, label, keyboard shortcut) and
what happens when it's selected. This is separate from the `StateNode` class
that implements the tool's behavior; the UI needs both.

[2]
Override the `Toolbar` component so we can place our tool in it. `DefaultToolbar`
provides the toolbar chrome and `DefaultToolbarContent` renders the built-in
tools, so we render our own `TldrawUiMenuItem` before it. `useIsToolSelected`
lets the button show as active when the sticker tool is the current tool.

[3]
The keyboard shortcuts dialog doesn't know about custom tools, so we override
it and append our tool after `DefaultKeyboardShortcutsDialogContent`. This makes
the tool's shortcut show up in the dialog.

[4]
The tool item references an icon named `heart-icon`, so we tell the UI where to
find that icon via the `assetUrls` prop. Any icon name that isn't a built-in
tldraw icon needs an entry here.

[5]
Define the tools array outside the component so it's a stable reference. We
pass the tools, overrides, components, and asset URLs to the `Tldraw` component,
and set `initialState="sticker"` so the tool is selected on load.
*/
