import { createShapeId, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					const arrowId = createShapeId()
					const rectId = createShapeId()
					editor.createShape({
						id: arrowId,
						x: 300,
						y: 300,
						type: 'arrow',
						props: {
							color: 'light-green',
							size: 's',
							bend: 0,
							start: {
								x: 0,
								y: 0,
							},
							end: {
								x: 400,
								y: 0,
							},
							text: '',
							labelPosition: 0.5,
						},
					})
					editor.zoomToFit()
					// editor.createShape({
					// 	id: rectId,
					// 	type: 'geo',
					// 	x: 600,
					// 	y: 300,
					// })

					// editor.createBindings([
					// 	{
					// 		type: 'arrow',
					// 		fromId: arrowId,
					// 		toId: rectId,
					// 		props: {
					// 			terminal: 'end',
					// 			normalizedAnchor: { x: 0.5, y: 0.5 },
					// 			isExact: false,
					// 			isPrecise: false,
					// 		},
					// 	},
					// ])

					setTimeout(() => {
						editor.animateShapes(
							[
								{
									id: arrowId,
									type: 'arrow',
									props: {
										arrowheadStart: 'diamond',
										color: 'blue',
										text: 'Helloooooooo',
										labelPosition: 0.5,
									},
								},
							],
							{ animation: { duration: 1000 } }
						)
					}, 1000)
				}}
			/>
		</div>
	)
}
