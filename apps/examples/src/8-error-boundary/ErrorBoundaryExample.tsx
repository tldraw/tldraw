import { createShapeId, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { ErrorShape } from './ErrorShape'

const shapes = [ErrorShape]

export default function ErrorBoundaryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapes={shapes}
				tools={[]}
				components={{
					ErrorFallback: null, // disable app-level error boundaries
					ShapeErrorFallback: ({ error }) => <div>Shape error! {String(error)}</div>, // use a custom error fallback for shapes
				}}
				onMount={(editor) => {
					// When the app starts, create our error shape so we can see.
					editor.createShapes([
						{
							type: 'error',
							id: createShapeId(),
							x: 0,
							y: 0,
							props: { message: 'Something has gone wrong' },
						},
					])

					// Center the camera on the error shape
					editor.zoomToFit()
					editor.resetZoom()
				}}
			/>
		</div>
	)
}
