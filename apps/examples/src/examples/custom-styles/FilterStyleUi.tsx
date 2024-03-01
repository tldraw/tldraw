import { track, useEditor } from 'tldraw'
import { MyFilterStyle } from './CardShape'

// There's a guide at the bottom of this file!

//[1]
export const FilterStyleUi = track(function FilterStyleUi() {
	const editor = useEditor()
	//[2]
	const filterStyle = editor.getSharedStyles().get(MyFilterStyle)
	if (!filterStyle) return null

	return (
		<div
			className="tlui-style-panel__wrapper"
			style={{
				position: 'absolute',
				zIndex: 300,
				top: 50,
				left: 8,
				padding: 15,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			filter:{' '}
			<select
				value={filterStyle.type === 'mixed' ? 'mixed' : filterStyle.value}
				// [3]
				onChange={(e) => {
					editor.batch(() => {
						if (editor.isIn('select')) {
							editor.setStyleForSelectedShapes(
								MyFilterStyle,
								MyFilterStyle.validate(e.target.value)
							)
						}
						editor.setStyleForNextShapes(MyFilterStyle, MyFilterStyle.validate(e.target.value))
					})
				}}
			>
				<option value="mixed" disabled>
					Mixed
				</option>
				<option value="none">None</option>
				<option value="invert">Invert</option>
				<option value="grayscale">Grayscale</option>
				<option value="blur">Blur</option>
			</select>
		</div>
	)
})

/* 
Introduction:
This is a an example of how to create a custom ui for your custom style. We want
to render the UI when the user has selected our card tool, or when they've selected a card
shape. Here, we've chosen a drop-down to let the user select the filter type, and we render
it in the top left corner of the editor. You could render your UI anywhere you want. Check
out the zones example to see how to render your UI in a particular zone, or the custom-ui
example if you want to redo the entire ui.

[1]
We use the `track` function to wrap our component. This makes our component reactive- it will
re-render whenever the signals it is tracking change. Check out the signia docs for more: 
https://signia.tldraw.dev/docs/API/signia_react/functions/track

[2]
Here we check if the user has selected a shape that uses our custom style, or if they've 
selected a tool associated with our custom style. If they haven't, we return null and don't 
render anything.

[3]
Here we add an event handler for when the user changes the value of the dropdown. We use the 
`batch` method to batch our changes into a single undoable action. We check if the user has 
selected any shapes, and if they have, we set the style for those shapes. We also set the style
for any shapes the user creates next. 

*/
