import { useEffect } from 'react'
import {
	ContextMenu,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DefaultContextMenuContent,
	TldrawEditor,
	TldrawUi,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultEditorAssetUrls,
	defaultOverlayUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	registerDefaultExternalContentHandlers,
	registerDefaultSideEffects,
	tipTapDefaultExtensions,
	useEditor,
	useToasts,
	useTranslation,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const allDefaultTools = [...defaultTools, ...defaultShapeTools]
const defaultOptions = {
	text: {
		tipTapConfig: {
			extensions: tipTapDefaultExtensions,
		},
		addFontsFromNode: defaultAddFontsFromNode,
	},
}

//[1]
export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				overlayUtils={defaultOverlayUtils}
				tools={allDefaultTools}
				persistenceKey="exploded-example"
				options={defaultOptions}
				assetUrls={defaultEditorAssetUrls}
			>
				<TldrawUi>
					<InsideEditorAndUiContext />
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}

function InsideEditorAndUiContext() {
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()

	// [2]
	useEffect(() => {
		registerDefaultExternalContentHandlers(editor, {
			maxImageDimension: 5000,
			maxAssetSize: 10 * 1024 * 1024, // 10mb
			acceptedImageMimeTypes: DEFAULT_SUPPORTED_IMAGE_TYPES,
			acceptedVideoMimeTypes: DEFAULT_SUPPORT_VIDEO_TYPES,
			toasts,
			msg,
		})

		const cleanupSideEffects = registerDefaultSideEffects(editor)

		return () => {
			cleanupSideEffects()
		}
	}, [editor, msg, toasts])

	return (
		<ContextMenu>
			<DefaultContextMenuContent />
		</ContextMenu>
	)
}

/*
The tldraw library is built from many sublibraries. This example shows how to build the tldraw
component from its subcomponents for max customisation. You can edit, omit or add to these
subcomponents to create your app.

[1] Here we've set up the TldrawEditor component with the default tools and shape utils.
You could input your own custom shapes/tools here. For help creating your own shapes/tools check
out the custom config example. We set the initial state to 'select' and render the UI, context menu
and canvas components. You could add your own custom components here, omit these ones, and/or
change the initial state of the application to whatever you want.

[2] Inside of the editor and UI context, we need to set up extra pieces to get the editor working
with our default shapes and tools. We register the default external content handlers, which sets up
handling for things like images and pasted content. We also register the default side effects, which
react to changes to the editor's store.

*/
