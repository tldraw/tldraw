import { createShapeId, Tldraw, TLShapePartial } from 'tldraw'
import 'tldraw/tldraw.css'
import { ErrorShape, ErrorShapeUtil } from './ErrorShape'

// There's a guide at the bottom of this file!

// [1]
const shapes = [ErrorShapeUtil]

// [2]
export default function ErrorBoundaryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapes}
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
					// [3]
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

/* 
This example shows how the tldraw error boundary can allow you to render a custom error
fallback for shapes that throw errors. We simulate this scenario by creating a shape
that always throws an error when it renders.

[1] 
We have a shape util that always throws an error when it renders. Check out ErrorShape.ts
to see how this works. It's important to define this array of shape utils outside of a
React compenent so that they are not recreated on every render.

[2]
We pass in our shape util to the tldraw component. We also pass in a custom error fallback
component that will be used to render any shapes that throw an error. Check out the 
custom component example for more examples of components you can customize.

[3]
When the app starts, we create our error shape and center the camera. 

*/
