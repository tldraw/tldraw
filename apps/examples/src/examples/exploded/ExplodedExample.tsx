import { useEffect } from 'react'
import {
	ContextMenu,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DefaultContextMenuContent,
	TldrawEditor,
	TldrawHandles,
	TldrawOverlays,
	TldrawScribble,
	TldrawSelectionForeground,
	TldrawShapeIndicators,
	TldrawUi,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultEditorAssetUrls,
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

// [1]
const components = {
	Scribble: TldrawScribble,
	ShapeIndicators: TldrawShapeIndicators,
	CollaboratorScribble: TldrawScribble,
	SelectionForeground: TldrawSelectionForeground,
	Handles: TldrawHandles,
	Overlays: TldrawOverlays,
}

const shapeUtils = [...defaultShapeUtils]

const bindingUtils = [...defaultBindingUtils]

const tools = [...defaultTools, ...defaultShapeTools]

const textOptions = {
	tipTapConfig: {
		extensions: tipTapDefaultExtensions,
	},
	addFontsFromNode: defaultAddFontsFromNode,
}

// [2]
export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				persistenceKey="exploded-example"
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				tools={tools}
				textOptions={textOptions}
				components={components}
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

	// [3]
	useEffect(() => {
		registerDefaultExternalContentHandlers(editor, {
			maxImageDimension: 5000,
			maxAssetSize: 10 * 1024 * 1024,
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

[1]
Here we've imported some components from the tldraw library which we will later pass to the
TldrawEditor component. These components are not part of the more minimal defaults, so we need to
import them separately. For help creating your own components to pass into the components prop check
out the custom components example.

[2]
Here we've configured the TldrawEditor with the pieces it needs:
- shape utils (shapeUtils) and binding utils (bindingUtils)
- tools (tools) and text options (textOptions)
- custom UI components (components)
- asset loading (assetUrls)

We also set the initial state to 'select' and provide a persistence key to save state locally. You
could add your own custom components here, omit these ones, and/or change the initial state of the
application to whatever you want.

[3]
Inside of the editor and UI context, we need to set up extra pieces to get the editor working
with our default shapes and tools. We register the default external content handlers, which sets up
handling for things like images, videos, and pasted content; this includes accepted mime types and
limits for image dimensions and asset sizes. We also register the default side effects, which react
to changes to the editor's store. Finally, we render a ContextMenu with the default content, which
you can replace or extend with your own.

*/
