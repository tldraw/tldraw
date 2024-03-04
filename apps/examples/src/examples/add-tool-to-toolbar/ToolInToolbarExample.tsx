import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	toolbarItem,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { StickerTool } from './sticker-tool-util'

// There's a guide at the bottom of this file!

// [1]
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.card = {
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
	toolbar(_app, toolbar, { tools }) {
		// Add the tool item from the context to the toolbar.
		toolbar.splice(4, 0, toolbarItem(tools.card))
		return toolbar
	},
}

// [2]
const components: TLComponents = {
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				{/* Ideally, we'd interleave this into the tools group */}
				<TldrawUiMenuItem {...tools['card']} />
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
First, we define the uiOverrides object. This object has a tools and toolbar
property. The tools property is a function that takes in the editor and the
default tools and returns the default tools with the new tool added. The toolbar
property is a function that takes in the app, the default toolbar, and the tools
and returns the default toolbar with the new tool added.

[2]
Next, we define the components object. This object has a KeyboardShortcutsDialog
property that is a function that takes in props and returns the default
KeyboardShortcutsDialog component with the DefaultKeyboardShortcutsDialogContent
component and the custom tool item added to it.

[3]
Then, we define the customAssetUrls object. This object has an icons property
that is an object with the key being the id of the icon and the value being the
url of the icon.

[4]
Finally, we define the customTools array. This array contains the custom tool
class. We then pass the customTools array, the uiOverrides object, the
components object, and the customAssetUrls object to the Tldraw component as
props. This will make the icon for the custom tool appear on the toolbar.

*/
