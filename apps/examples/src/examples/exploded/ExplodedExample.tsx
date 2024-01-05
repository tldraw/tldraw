import { DefaultShapeErrorFallback } from '@tldraw/editor/src/lib/components/default-components/DefaultShapeErrorFallback'
import { DefaultShapeIndicatorErrorFallback } from '@tldraw/editor/src/lib/components/default-components/DefaultShapeIndicatorErrorFallback'
import {
	Canvas,
	ContextMenu,
	DefaultBackground,
	DefaultBrush,
	DefaultCollaboratorHint,
	DefaultCursor,
	DefaultErrorFallback,
	DefaultGrid,
	DefaultHandle,
	DefaultHandles,
	DefaultHoveredShapeIndicator,
	DefaultScribble,
	DefaultSelectionBackground,
	DefaultSelectionForeground,
	DefaultSnapLine,
	DefaultSpinner,
	DefaultSvgDefs,
	ShapeIndicator,
	TldrawEditor,
	TldrawUi,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const defaultComponents = {
	Background: DefaultBackground,
	SvgDefs: DefaultSvgDefs,
	Brush: DefaultBrush,
	ZoomBrush: DefaultBrush,
	ScreenshotBrush: DefaultBrush,
	CollaboratorBrush: DefaultBrush,
	Cursor: DefaultCursor,
	CollaboratorCursor: DefaultCursor,
	CollaboratorHint: DefaultCollaboratorHint,
	CollaboratorShapeIndicator: ShapeIndicator,
	Grid: DefaultGrid,
	Scribble: DefaultScribble,
	SnapLine: DefaultSnapLine,
	Handles: DefaultHandles,
	Handle: DefaultHandle,
	CollaboratorScribble: DefaultScribble,
	ErrorFallback: DefaultErrorFallback,
	ShapeErrorFallback: DefaultShapeErrorFallback,
	ShapeIndicatorErrorFallback: DefaultShapeIndicatorErrorFallback,
	Spinner: DefaultSpinner,
	SelectionBackground: DefaultSelectionBackground,
	SelectionForeground: DefaultSelectionForeground,
	HoveredShapeIndicator: DefaultHoveredShapeIndicator,
}

//[2]
export default function ExplodedExample() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				tools={[...defaultTools, ...defaultShapeTools]}
				components={defaultComponents}
				persistenceKey="exploded-example"
			>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
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
Here we've imported the default components from the tldraw library and made them
into an object that we'll pass to the TldrawEditor component. You could replace
any of these components with your own custom components. Omiting a component 
will use the default component instead. Check out the custom components example
for an idea of exactly how to do this.

[2]
Here we've passed the default components object to the TldrawEditor component. Along
with default tools and shapeutils, You could input your own custom shapes/tools here. 
For help creating your own shapes/tools check out the custom config example.

We also set the initial state to 'select' and render the UI, conrtext menu and canvas
components. You could add your own custom components here, omit these ones, and/or 
change the initial state of the application to whatever you want. 

*/
