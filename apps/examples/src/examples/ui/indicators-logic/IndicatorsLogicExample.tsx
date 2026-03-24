import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function IndicatorsLogicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
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
