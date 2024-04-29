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
		const isStickerSelected = useIsToolSelected(tools['sticker'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['sticker']} isSelected={isStickerSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
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

// [3]
export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'heart-icon': '/heart-icon.svg',
	},
}

// [4]
const customTools = [StickerTool]

export default function ToolInToolbarExample() {
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
add our custom tool to the ui's context. We can also override the toolbar function
to add our custom tool to the toolbar. We are going to splice it into the toolbar
so it appears in between the eraser and arrow tools.

[2]
Next, we want to override the default keyboard shortcuts dialog so that the 
shortcut for our custom tool appears in the dialog. We don't want to change its 
appearance very much, so we can use the DefaultKeyboardShortcutsDialog component 
and pass in the DefaultKeyboardShortcutsDialogContent component. With the useTools 
hook, we can get the tools from context and pass in the sticker tool to the keyboard 
shortcuts dialog. This will make the keyboard shortcut for the sticker tool appear 
in the dialog.

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
