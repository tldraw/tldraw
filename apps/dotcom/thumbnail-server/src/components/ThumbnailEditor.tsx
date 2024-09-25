import {
	DefaultSpinner,
	ErrorScreen,
	LoadingScreen,
	TLEditorSnapshot,
	TldrawEditor,
	TldrawHandles,
	TldrawScribble,
	TldrawSelectionBackground,
	TldrawSelectionForeground,
	TldrawShapeIndicators,
	defaultBindingUtils,
	defaultEditorAssetUrls,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	usePreloadAssets,
} from 'tldraw'
import 'tldraw/tldraw.css'

const defaultComponents = {
	Scribble: TldrawScribble,
	ShapeIndicators: TldrawShapeIndicators,
	CollaboratorScribble: TldrawScribble,
	SelectionForeground: TldrawSelectionForeground,
	SelectionBackground: TldrawSelectionBackground,
	Handles: TldrawHandles,
}

export function ThumbnailEditor({ snapshot }: { snapshot: TLEditorSnapshot }) {
	const assetLoading = usePreloadAssets(defaultEditorAssetUrls)

	if (assetLoading.error) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!assetLoading.done) {
		return (
			<LoadingScreen>
				<DefaultSpinner />
			</LoadingScreen>
		)
	}

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				snapshot={snapshot}
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				tools={[...defaultTools, ...defaultShapeTools]}
				components={defaultComponents}
				onMount={(e) => {
					e.zoomToFit({ immediate: true })
				}}
			/>
		</div>
	)
}
