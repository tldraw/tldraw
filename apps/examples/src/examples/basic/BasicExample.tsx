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
						type: 'embed',
						props: {
							w: 800,
							h: 450,
							url: 'https://www.youtube.com/watch?v=UEc-oy93lf8',
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
									type: 'embed',
									props: {
										w: 400,
										h: 200,
										url: 'https://www.youtube.com/watch?v=cYvuoxM_JSU',
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
