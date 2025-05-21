import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ErrorShape, ErrorShapeUtil } from './ErrorShape'

// There's a guide at the bottom of this file!

// [1]
const shapes = [ErrorShapeUtil]

export default function ErrorBoundaryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapes}
				components={{
					// [2]
					ShapeErrorFallback: ({ error }) => <div>Shape error! {String(error)}</div>,
				}}
				onMount={(editor) => {
					// [3]
					editor.createShape<ErrorShape>({ type: 'error' })
				}}
			/>
		</div>
	)
}

/* 
This example shows how to customize the error fallback that appears when a shape throws an error. We
simulate this scenario by creating a shape that always throws an error when it renders.

[1] 
This is the custom shape that always throws an error when it renders. Check out ErrorShape.ts to see
how it works.

[2]
Pass in the custom error fallback component.

[3]
When the app starts, create our error shape so that we can see the custom error fallback. 

*/
