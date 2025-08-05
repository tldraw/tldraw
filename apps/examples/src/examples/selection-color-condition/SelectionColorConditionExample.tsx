import { Tldraw, react } from 'tldraw'
import 'tldraw/tldraw.css'
import './selection-color-condition.css'

export default function SelectionColorConditionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="selection-color-condition"
				onMount={(editor) => {
					// Listen for selection changes using the react function
					const stopListening = react('update selection classname', () => {
						const selectedShapes = editor.getSelectedShapes()
						
						// Check if all selected shapes are rectangle geo shapes
						// This condition can be customized for any shape type or combination
						const allAreRectangles = selectedShapes.length > 0 && selectedShapes.every(shape => 
							shape.type === 'geo' && shape.props.geo === 'rectangle'
						)
						
						// Update the container's CSS class based on the condition
						// The CSS will handle the visual styling
						if (allAreRectangles) {
							editor.getContainer().classList.add('rectangle-selection')
						} else {
							editor.getContainer().classList.remove('rectangle-selection')
						}
					})

					return stopListening
				}}
			/>
		</div>
	)
}