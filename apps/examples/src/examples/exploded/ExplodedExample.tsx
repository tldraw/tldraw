import {
	ContextMenu,
	DefaultContextMenuContent,
	ErrorScreen,
	LoadingScreen,
	TldrawEditor,
	TldrawHandles,
	TldrawScribble,
	TldrawSelectionBackground,
	TldrawSelectionForeground,
	TldrawUi,
	defaultBindingUtils,
	defaultEditorAssetUrls,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	usePreloadAssets,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const defaultComponents = {
	Scribble: TldrawScribble,
	CollaboratorScribble: TldrawScribble,
	SelectionForeground: TldrawSelectionForeground,
	SelectionBackground: TldrawSelectionBackground,
	Handles: TldrawHandles,
}

//[2]
export default function ExplodedExample() {
	const assetLoading = usePreloadAssets(defaultEditorAssetUrls)

	if (assetLoading.error) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!assetLoading.done) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				bindingUtils={defaultBindingUtils}
				tools={[...defaultTools, ...defaultShapeTools]}
				components={defaultComponents}
				persistenceKey="exploded-example"
			>
				<TldrawUi>
					<ContextMenu>
						<DefaultContextMenuContent />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}

/* 
The tldraw library is built from many sublibraries. This example shows how to 
build the tldraw component from its subcomponents for max customisation. You 
can edit, omit or add to these subcomponents to create your app.

[1]
Here we've imported some components from the tldraw library which we will later
pass to the TldrawEditor component. These components are not part of the more 
minimal defaults, so we need to import them separately. For help creating your
own components to pass into the components prop check out the custom components 
example.

[2]
Here we've passed the default components object to the TldrawEditor component. Along
with default tools and shapeutils, You could input your own custom shapes/tools here. 
For help creating your own shapes/tools check out the custom config example.

We also set the initial state to 'select' and render the UI, context menu and canvas
components. You could add your own custom components here, omit these ones, and/or 
change the initial state of the application to whatever you want. 

*/
