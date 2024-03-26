import { Editor, TLStoreSnapshot, Tldraw } from 'tldraw'
import { PlayingCardTool } from './PlayingCardShape/playing-card-tool'
import { PlayingCardUtil } from './PlayingCardShape/playing-card-util'
import snapshot from './snapshot.json'
import { components, uiOverrides } from './ui-overrides'
// There's a guide at the bottom of this file!

// [1]
const customShapes = [PlayingCardUtil]
const customTools = [PlayingCardTool]

export default function BoundsSnappingShapeExample() {
	// [2]
	const handleMount = (editor: Editor) => {
		editor.user.updateUserPreferences({ isSnapMode: true })
	}
	// [3]
	return (
		<div className="tldraw__editor">
			<Tldraw
				//[a]
				shapeUtils={customShapes}
				tools={customTools}
				// [b]
				overrides={uiOverrides}
				components={components}
				// [c]
				onMount={handleMount}
				// [d]
				snapshot={snapshot as TLStoreSnapshot}
			/>
		</div>
	)
}

/*
Introduction:

This example shows how to create a shape with custom snapping geometry. 
When shapes are moved around in snap mode, they will snap to the bounds 
of other shapes by default. However a shape can return custom snapping
geometry to snap to instead. This example creates a playing card shape. 
The cards are designed to snap together so that the top-left icon 
remains visible when stacked, similar to a hand of cards in a game.
The most relevant code for this customisation is in playing-card-util.tsx.

[1]
We define the custom shape and util arrays we'll pass to the Tldraw component.
It's important to do this outside of the component so that the arrays don't
change on every render.


This is where we define the Tldraw component and pass in all our customisations.

[2] 
We define a handleMount function that will be called when the editor mounts.
We're using it to set the snap mode to true in the user preferences. This is 
just to help demonstrate the custom snapping geometry feature. Without snap 
mode being set in this way the user can still enter it by holding cmd/ctrl 
while dragging.

[3]
This is where we're passing in all our customisations to the Tldraw component.
Check out the associated files for more information on what's being passed in.
		
	[a] Firstly our custom shape (playing-card-util.tsx) and tool (playing-card-tool.tsx)
		This tells the editor about our custom shape and tool.
	[b] Then our the uiOverrides and custom keyboard shortcuts component (ui-overrides.tsx), 
		this makes sure that an icon for our tool appears in the toolbar and the shortcut 
		for it appears in the dialog. 
	[c] We pass in our handleMount function so that it's called when the editor mounts.
	
	[d] Finally we pass in a snapshot so that the editor starts with some shapes in it. 
		This isn't necessary, it just makes the example clearer on first glance.
*/
