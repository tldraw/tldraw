import { DEFAULT_THEME, TLTheme, TLThemeId, Tldraw, react, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const RECTANGLE_SELECTION_THEME_ID = 'rectangle-selection' as TLThemeId

// [1]
const RECTANGLE_SELECTION_THEME: TLTheme = structuredClone(DEFAULT_THEME)
RECTANGLE_SELECTION_THEME.id = RECTANGLE_SELECTION_THEME_ID
RECTANGLE_SELECTION_THEME.colors.light.selectionStroke = '#cc0000'
RECTANGLE_SELECTION_THEME.colors.light.selectionFill = 'rgba(255, 68, 68, 0.24)'
RECTANGLE_SELECTION_THEME.colors.dark.selectionStroke = '#ff4444'
RECTANGLE_SELECTION_THEME.colors.dark.selectionFill = 'rgba(255, 68, 68, 0.24)'

const themes = {
	[RECTANGLE_SELECTION_THEME_ID]: RECTANGLE_SELECTION_THEME,
}

export default function SelectionColorConditionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [2]
				themes={themes}
				onMount={(editor) => {
					// [3]
					const stopListening = react('update selection theme', () => {
						const selectedShapes = editor.getSelectedShapes()

						// [4]
						const allAreRectangles =
							selectedShapes.length > 0 &&
							selectedShapes.every(
								(shape) => editor.isShapeOfType(shape, 'geo') && shape.props.geo === 'rectangle'
							)

						// [5]
						editor.setCurrentTheme(allAreRectangles ? RECTANGLE_SELECTION_THEME_ID : 'default')
					})

					// [6]
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
When all selected shapes are rectangles, the selection will appear red instead of the default blue.

Selection colors are painted to the canvas overlay from the editor's theme, so we swap the
active theme rather than overriding CSS variables.

[1]
Clone `DEFAULT_THEME` and override `selectionStroke` and `selectionFill` for both the light
and dark palettes. These are the keys the canvas overlay reads when drawing the selection.

[2]
Pass our custom theme to `<Tldraw>` via the `themes` prop so it's registered at mount time.
The `default` theme is always available, so we only need to register additional themes here.

[3]
We use the `react` function to create a reactive effect that runs whenever the selection changes.

[4]
Here we check if all selected shapes are rectangle geo shapes. You can customize this condition
to check for any shape type or combination. For example:
- Check for circles: shape.type === 'geo' && shape.props.geo === 'ellipse'
- Check for text: shape.type === 'text'
- Check for mixed types: shape.type === 'geo' && (shape.props.geo === 'rectangle' || shape.props.geo === 'ellipse')

[5]
Switch to the custom theme when the condition holds, and back to the default theme otherwise.
The current theme is reactive, so the canvas re-paints with the new colors immediately.

[6]
We create some shapes to test our condition.

*/
