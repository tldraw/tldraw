import { createShapeId, TLBaseShape, TLBoxUtil, Tldraw, TldrawEditorConfig } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function ErrorBoundaryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{
					// disable app-level error boundaries:
					ErrorFallback: null,
					// use a custom error fallback for shapes:
					ShapeErrorFallback: ({ error }) => <div>Shape error! {String(error)}</div>,
				}}
				// below, we define a custom shape that always throws an error so we can see our new error boundary in action
				config={customConfigWithErrorShape}
				onMount={(app) => {
					// when the app starts, create our error shape so we can see
					// what it looks like:
					app.createShapes([
						{
							type: 'error',
							id: createShapeId(),
							x: 0,
							y: 0,
							props: { message: 'Something has gone wrong' },
						},
					])

					// center the camera on the error shape
					app.zoomToFit()
					app.resetZoom()
				}}
			/>
		</div>
	)
}

// do make it easy to see our custom shape error fallback, let's create a new
// shape type that always throws an error. See CustomConfigExample for more info
// on creating custom shapes.
type ErrorShape = TLBaseShape<'error', { w: number; h: number; message: string }>

class ErrorUtil extends TLBoxUtil<ErrorShape> {
	override type = 'error' as const

	defaultProps() {
		return { message: 'Error!', w: 100, h: 100 }
	}
	render(shape: ErrorShape) {
		throw new Error(shape.props.message)
	}
	indicator() {
		throw new Error(`Error shape indicator!`)
	}
}

const customConfigWithErrorShape = new TldrawEditorConfig({
	validate: true,
	shapes: {
		error: {
			util: ErrorUtil,
		},
	},
})
