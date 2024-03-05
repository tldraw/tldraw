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
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { StickerTool } from './sticker-tool-util'

// There's a guide at the bottom of this file!

// [1]
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
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
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['sticker']} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['sticker']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

// [3]
export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'heart-icon': '/heart-icon.svg',
	},
}

// [4]
const customTools = [StickerTool]
export default function CustomToolExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// Pass in the array of custom tool classes
				tools={customTools}
				// Set the initial state to the sticker tool
				initialState="sticker"
				// Pass in our ui overrides
				overrides={uiOverrides}
				// pass in our custom components
				components={components}
				// pass in our custom asset urls
				assetUrls={customAssetUrls}
			/>
		</div>
	)
}

/* 
Introduction:
You can make an icon for your custom tool appear on tldraw's toolbar. To do this 
you will need to override the toolbar component, pass in a custom component for 
the keyboard shortcuts dialog, and pass in an asset url for your icon. This 
example shows how to do that. For more information on how to implement custom 
tools, check out the custom tool example.

[1]
First, we define the uiOverrides object. We can override the tools function to
add our custom tool to the ui's context. This tells the UI the basic information
about our tool: its icon, keyboard shortcut, what happens when it's selected, etc.
This won't cause it to appear anywhere - that comes next.

[2]
Next, we want we want to override some of the default UI components to show our
new tool. We'll add it to the toolbar, and to the keyboard shortcuts diaglog. We
don't need to change the appearance of these components very much - so we can use
the `DefaultToolbar` and `DefaultKeyboardShortcutsDialog` components with slightly
different content. We use the `useTools` hook to get the tool item we created in
the `uiOverrides` object and use it to create the new menu items. Ideally, these
would be interleaved at an appropriate place with the default content, but to keep
things simple we'll just add them to the start for now.

[3]
We need to make sure the editor knows where to find the icon for our custom tool.
We do this by defining the customAssetUrls object and passing in the asset url for
our icon.

[4]
Finally, we define the customTools array. This array contains the custom tool
class. We then pass the customTools array, the uiOverrides object, the
components object, and the customAssetUrls object to the Tldraw component as
props. This will make the icon for the custom tool appear on the toolbar.

*/
