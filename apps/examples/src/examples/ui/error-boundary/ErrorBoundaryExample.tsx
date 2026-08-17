import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ErrorShapeUtil } from './ErrorShape'

// There's a guide at the bottom of this file!

// [1]
const shapeUtils = [ErrorShapeUtil]

// [2]
const components: TLComponents = {
	ShapeErrorFallback: ({ error }) => <div>Shape error! {String(error)}</div>,
}

export default function ErrorBoundaryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					// [3]
					editor.createShape({ type: 'error' })
				}}
			/>
		</div>
	)
}

/*
Each shape renders inside its own error boundary, so a shape that throws shows a fallback
instead of taking down the editor. This example customizes that fallback.

[1]
A custom shape whose `component()` always throws. See ErrorShape.ts.

[2]
`ShapeErrorFallback` receives the thrown `error`. Like `shapeUtils`, `components` is
defined at module level so `<Tldraw>` doesn't see a new object every render.

[3]
Create the error shape on mount so the fallback is visible straight away.
*/
