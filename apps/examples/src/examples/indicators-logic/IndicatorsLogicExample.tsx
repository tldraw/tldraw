import { TLComponents, Tldraw, useEditor, useEditorComponents, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLComponents = {
	OnTheCanvas: () => {
		const editor = useEditor()

		// [1]
		const renderingShapes = useValue(
			'rendering shapes',
			() => editor.getRenderingShapes().filter((_info) => true),
			[editor]
		)

		// [2]
		const { ShapeIndicator } = useEditorComponents()
		if (!ShapeIndicator) return null

		return (
			<div style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999 }}>
				{renderingShapes.map(({ id }) => (
					<ShapeIndicator key={id + '_indicator'} shapeId={id} />
				))}
			</div>
		)
	},
	// [3]
	// ShapeIndicators: () => {
	// 	return <DefaultShapeIndicators showAll />
	// },
}

export default function IndicatorsLogicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) {
						editor.createShapes([
							{
								type: 'geo',
								x: 100,
								y: 100,
							},
							{
								type: 'geo',
								x: 500,
								y: 150,
							},
							{
								type: 'geo',
								x: 100,
								y: 500,
							},
							{
								type: 'geo',
								x: 500,
								y: 500,
							},
						])
					}
				}}
			/>
		</div>
	)
}

/*
[1]
Get which indicators to show (based on the shapes currently on screen).
You could include logic here using the filter to narrow down which shapes
you want to show the indicators for.

[2]
You could override the default ShapeIndicator component in this
same TLComponents object, but the default (DefaultIndicator.tsx)
has a lot of logic for where and how to display the indicator.

[3]
If all you want to do is show or hide all the indicators, you could 
create an override for the ShapeIndicators component that returns the
DefaultShapeIndicators component with `hideAll` or `showAll` props 
set to true.
*/
