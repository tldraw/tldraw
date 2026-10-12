import { useEffect } from 'react'
import {
	ContextMenu,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DefaultContextMenuContent,
	TldrawEditor,
	TldrawUi,
	defaultAddFontsFromNode,
	defaultAssetUtils,
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

// [1]
export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				assetUtils={defaultAssetUtils}
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
The `Tldraw` component is a thin wrapper that wires these pieces together. Assembling them
yourself lets you swap or omit any of them.

[1]
`TldrawEditor` is the UI-free editor. Everything the `Tldraw` component normally supplies is
passed in explicitly here: the default shape utils, binding utils, asset utils, overlay utils,
tools, asset URLs, and the rich text options. Swap any of these for your own; the custom config example shows
how to write shapes and tools. `TldrawUi` renders the default UI around it, and the context menu
is mounted as a child so it can wrap the canvas.

[2]
Two more things the `Tldraw` component does on mount that `TldrawEditor` does not: register the
default external content handlers (dropped and pasted files, URLs, embeds, SVG text) and the
default store side effects (for example, resolving an embed's aspect ratio when it is created).
Both need the toasts and translation contexts from `TldrawUi`, which is why this component is
rendered inside it.
*/
