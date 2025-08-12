import { TLGeoShape, Tldraw, react } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
export default function SelectionColorConditionExample() {
	return (
		<div className="tldraw__editor">
			<style>{`
				/* Custom selection color for rectangle shapes */
				.tl-container.rectangle-selection {
					--tl-color-selection: #ff4444;
					--tl-color-selection-stroke: #cc0000;
				}
			`}</style>

			<Tldraw
				onMount={(editor) => {
					// [2]
					const stopListening = react('update selection classname', () => {
						const selectedShapes = editor.getSelectedShapes()

						// [3]
						const allAreRectangles =
							selectedShapes.length > 0 &&
							selectedShapes.every(
								(shape) =>
									editor.isShapeOfType<TLGeoShape>(shape, 'geo') && shape.props.geo === 'rectangle'
							)

						// [4]
						if (allAreRectangles) {
							editor.getContainer().classList.add('rectangle-selection')
						} else {
							editor.getContainer().classList.remove('rectangle-selection')
						}
					})

					// [5]
					editor
						.createShapes<TLGeoShape>([
							{ type: 'geo', x: 0, y: 0 },
							{ type: 'geo', x: 120, y: 0 },
						])
						.selectAll()
						.zoomToSelection()
						.createShape<TLGeoShape>({ type: 'geo', x: 60, y: 120, props: { geo: 'ellipse' } })

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

[1]
We use the onMount prop to set up our selection listener when the editor is first mounted.

[2]
We use the react function to create a reactive effect that runs whenever the selection changes.
The first parameter is a unique name for this effect, and the second is a function that will
be called whenever the selection updates.

[3]
Here we check if all selected shapes are rectangle geo shapes. You can customize this condition
to check for any shape type or combination. For example:
- Check for circles: shape.type === 'geo' && shape.props.geo === 'ellipse'
- Check for text: shape.type === 'text'
- Check for mixed types: shape.type === 'geo' && (shape.props.geo === 'rectangle' || shape.props.geo === 'ellipse')

[4]
Based on our condition, we add or remove a CSS class from the editor's container. The CSS
file (selection-color-condition.css) defines the custom colors for the .rectangle-selection class.

[5]
We create some shapes to test our condition.

*/
