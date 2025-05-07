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
	TldrawSelectionBackground,
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
const defaultComponents = {
	Scribble: TldrawScribble,
	ShapeIndicators: TldrawShapeIndicators,
	CollaboratorScribble: TldrawScribble,
	SelectionForeground: TldrawSelectionForeground,
	SelectionBackground: TldrawSelectionBackground,
	Handles: TldrawHandles,
	Overlays: TldrawOverlays,
}

const allDefaultTools = [...defaultTools, ...defaultShapeTools]
const defaultTextOptions = {
	tipTapConfig: {
		extensions: tipTapDefaultExtensions,
	},
	addFontsFromNode: defaultAddFontsFromNode,
}

//[2]
export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				tools={allDefaultTools}
				components={defaultComponents}
				persistenceKey="exploded-example"
				textOptions={defaultTextOptions}
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

[1] Here we've imported some components from the tldraw library which we will later pass to the
TldrawEditor component. These components are not part of the more minimal defaults, so we need to
import them separately. For help creating your own components to pass into the components prop check
out the custom components example.

[2] Here we've passed the default components object to the TldrawEditor component. Along with
default tools and shapeutils, You could input your own custom shapes/tools here. For help creating
your own shapes/tools check out the custom config example.

We also set the initial state to 'select' and render the UI, context menu and canvas components. You
could add your own custom components here, omit these ones, and/or change the initial state of the
application to whatever you want. 

[3] Inside of the editor and UI context, we need to set up extra pieces to get the editor working
with our default shapes and tools. We register the default external content handlers, which sets up
handling for things like images and pasted content. We also register the default side effects, which
react to changes to the editor's store.

*/
