import { DEFAULT_THEME, TLTheme, Tldraw, react, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const RECTANGLE_SELECTION_THEME: TLTheme = structuredClone(DEFAULT_THEME)
RECTANGLE_SELECTION_THEME.colors.light.selectionStroke = '#cc0000'
RECTANGLE_SELECTION_THEME.colors.light.selectionFill = 'rgba(255, 68, 68, 0.24)'
RECTANGLE_SELECTION_THEME.colors.dark.selectionStroke = '#ff4444'
RECTANGLE_SELECTION_THEME.colors.dark.selectionFill = 'rgba(255, 68, 68, 0.32)'

export default function SelectionColorConditionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [2]
					const stopListening = react('update selection theme', () => {
						const selectedShapes = editor.getSelectedShapes()

						// [3]
						const allAreRectangles =
							selectedShapes.length > 0 &&
							selectedShapes.every(
								(shape) => editor.isShapeOfType(shape, 'geo') && shape.props.geo === 'rectangle'
							)

						// [4]
						editor.updateTheme({
							...(allAreRectangles ? RECTANGLE_SELECTION_THEME : DEFAULT_THEME),
							id: 'default',
						})
					})

					// [5]
					editor
						.createShapes([
							{ type: 'geo', x: 0, y: 0 },
							{ type: 'geo', x: 120, y: 0 },
						])
						.selectAll()
						.zoomToSelection()
						.createShape({ type: 'geo', x: 60, y: 120, props: { geo: 'ellipse' } })

					return stopListening
				}}
			/>
		</div>
	)
}

/*

Introduction:

This example shows how to change the selection color based on the types of shapes selected.
When all selected shapes are rectangles, the selection appears red instead of the default blue.

[1]
We define an alternative theme by cloning DEFAULT_THEME and overriding the
`selectionStroke` and `selectionFill` colors for both light and dark modes.
Selection colors live on the theme since the v5 overlay system; the CSS
variables that previously controlled them no longer affect canvas overlays.

[2]
We use react() inside onMount to subscribe to changes in the selection.
The first parameter is a unique name for this effect, and the second is a
function that will be called whenever any signals it reads change.

[3]
Here we check if all selected shapes are rectangle geo shapes. You can
customize this condition to check for any shape type or combination.

[4]
Swap the editor's default theme between the red variant and the original
based on the condition. updateTheme() updates only this editor's
ThemeManager, so the global DEFAULT_THEME stays untouched.

[5]
We create some shapes to test our condition.

*/
