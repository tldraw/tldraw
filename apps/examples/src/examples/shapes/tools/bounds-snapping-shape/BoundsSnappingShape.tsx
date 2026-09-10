import { Editor, TLStoreSnapshot, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
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

This example shows how to create a shape with custom snapping geometry. When shapes are moved around
in snap mode, they snap to the bounds of other shapes by default. A shape can return custom snapping
geometry to snap to instead. This example creates a playing card shape. The cards are designed to
snap together so that the top-left icon remains visible when stacked, like a hand of cards in a game.
The most relevant code for this customisation is in playing-card-util.tsx.

[1]
We define the custom shape and tool arrays outside of the component so that they don't change on
every render, which would cause the editor to re-register them.

[2]
Snap mode is off by default; the user can still snap by holding cmd/ctrl while dragging. We turn it
on in the user preferences on mount so the custom snapping is obvious right away.

[3]
This is where we pass all our customisations to the Tldraw component.

    [a] Our custom shape (playing-card-util.tsx) and tool (playing-card-tool.tsx).
    [b] The UI overrides and components (ui-overrides.tsx) that add the tool to the toolbar and
        the keyboard shortcuts dialog.
    [c] Our handleMount function.
    [d] A snapshot so that the editor starts with two cards in it. This isn't necessary, it just
        makes the example clearer at first glance.
*/
