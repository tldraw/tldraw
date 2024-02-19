import {
	TLShapeId,
	TldrawEditor,
	createShapeId,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function Speedster() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				tools={[...defaultTools, ...defaultShapeTools]}
				components={{ Canvas: null }}
				onMount={(editor) => {
					const ids = Array.from(Array(1000)).map((_, i) => createShapeId(i.toString()))

					let id: TLShapeId
					for (let i = 0; i < ids.length; i++) {
						id = ids[i]
						editor.createShape({
							id,
							type: 'geo',
							x: 200 * i + 10,
							props: {
								geo: 'rectangle',
								w: 200,
								h: 100,
							},
						})
					}
					performance.mark('start')
					for (let i = 0; i < ids.length; i++) {
						id = ids[i]
						editor.updateShape({
							id,
							type: 'geo',
							x: 300 * i + 10,
							props: {
								geo: 'ellipse',
								w: 100,
								h: 100,
							},
						})
					}
					performance.mark('end')
					console.log(performance.measure('update', 'start', 'end'))
				}}
			/>
		</div>
	)
}
