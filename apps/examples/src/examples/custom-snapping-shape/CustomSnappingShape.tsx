import { Editor, Tldraw } from '@tldraw/tldraw'
import { PlayingCardTool } from './PlayingCardShape/playing-card-tool'
import { PlayingCardUtil } from './PlayingCardShape/playing-card-util'
import snapshot from './snapshot.json'
import { components, uiOverrides } from './ui-overrides'

// There's a guide at the bottom of this file!

// [1]
const customShapes = [PlayingCardUtil]
const customTools = [PlayingCardTool]

// [2]
export default function CustomSnappingShapeExample() {
	// [a]
	const handleMount = (editor: Editor) => {
		editor.user.updateUserPreferences({ isSnapMode: true })
	}
	// [b]
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapes}
				tools={customTools}
				overrides={uiOverrides}
				components={components}
				onMount={handleMount}
				snapshot={snapshot}
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

*/
