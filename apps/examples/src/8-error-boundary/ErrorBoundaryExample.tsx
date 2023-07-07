import { createShapeId, Tldraw, TLShapePartial } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { ErrorShape, ErrorShapeUtil } from './ErrorShape'

const shapes = [ErrorShapeUtil]

export default function ErrorBoundaryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapes}
				tools={[]}
				components={{
					ShapeErrorFallback: ({ error }) => <div>Shape error! {String(error)}</div>, // use a custom error fallback for shapes
				}}
				onMount={(editor) => {
					const errorShapePartial: TLShapePartial<ErrorShape> = {
						type: 'error',
						id: createShapeId(),
						x: 0,
						y: 0,
						props: { message: 'Something has gone wrong' },
					}

					// When the app starts, create our error shape so we can see.
					editor.createShapes<ErrorShape>([errorShapePartial])

					// Center the camera on the error shape
					editor.zoomToFit()
					editor.resetZoom()
				}}
			/>
		</div>
	)
}
