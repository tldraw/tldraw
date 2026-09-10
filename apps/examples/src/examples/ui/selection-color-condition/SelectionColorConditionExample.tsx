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
This example changes the selection color based on which shapes are selected:
red when every selected shape is a rectangle, the default blue otherwise.

[1]
Selection colors live on the theme (`selectionStroke` and `selectionFill`), not
in CSS variables, because the selection overlays are drawn to canvas. We clone
DEFAULT_THEME and override those two colors for both light and dark modes.

[2]
`react` runs the callback once, then again whenever any signal it read changes.
Here it reads the selection, so it re-runs on every selection change. It
returns a disposer, which we return from onMount so it's cleaned up when the
editor unmounts.

[3]
Change this condition to check for any shape type or combination.

[4]
`editor.updateTheme` replaces the theme registered under the given id. Both
variants keep the id 'default', so this swaps the current theme in place and
leaves the module-level DEFAULT_THEME object untouched.

[5]
Some shapes to test with. The two rectangles are selected on load.
*/
