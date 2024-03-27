import { TLGeoShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function Develop() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// persistenceKey="tldraw_example"
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
					if (editor.getCurrentPageShapeIds().size === 0) {
						editor.createShape<TLGeoShape>({
							type: 'geo',
							x: 0,
							y: 0,
							props: {
								w: 800,
								h: 800,
							},
						})
					}
				}}
				cameraOptions={{
					fit: 'contain',
					bounds: {
						x: 0,
						y: 0,
						w: 800,
						h: 800,
					},
					origin: [0.5, 0.5],
					padding: [50, 100],
					panSpeed: 1,
					zoomSteps: [0.5, 0.75, 1, 1.5, 2],
					zoomMax: 2,
					zoomMin: 0.5,
					zoomSpeed: 1,
				}}
			/>
		</div>
	)
}
