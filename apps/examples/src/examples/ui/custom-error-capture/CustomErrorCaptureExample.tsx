import { getErrorAnnotations, Tldraw, TLEditorComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-error-capture.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLEditorComponents = {
	// [2]
	ErrorFallback: ({ error }) => {
		// [3]
		const annotations = error instanceof Error ? getErrorAnnotations(error) : null

		return (
			<div className="custom-error">
				<h1>Something went wrong</h1>
				<div>{error instanceof Error ? error.message : String(error)}</div>

				{/* [4] */}
				{annotations && (
					<pre className="custom-error__annotations">{JSON.stringify(annotations, null, 2)}</pre>
				)}

				<button onClick={() => window.location.reload()}>Refresh</button>
			</div>
		)
	},
	// [5]
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		return (
			<button
				className="custom-error__button"
				onClick={() => {
					// [6]
					editor.createShape({
						// @ts-expect-error
						type: 'does-not-exist',
					})
				}}
			>
				Throw an error
			</button>
		)
	},
}

export default function CustomErrorCaptureExample() {
	return (
		<div className="tldraw__editor">
			{/* [7] */}
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
Define your component overrides outside of the React component so that they're static. If you must
define them inside the component, wrap them in `useMemo` so they aren't recreated on every render.

[2]
`ErrorFallback` is displayed when a critical error occurs in the editor that would otherwise crash
the entire application. This is different from `ShapeErrorFallback`, which handles errors in
individual shapes. The component receives the error, so you can match it to your app's design and
offer recovery options.

[3]
`getErrorAnnotations` retrieves the debugging information tldraw attaches to errors: tags
(key-value pairs for categorization) and extras (additional context data such as the current tool
or the selected shapes). This is what you'd forward to an error reporting service like Sentry.

[4]
Here we show the annotations on screen so you can see what's captured. In production you'd send
them to your error tracking service instead of displaying them to users.

[5]
For this example, we've added a button in the `InFrontOfTheCanvas` slot that intentionally
triggers an error so you can see the custom `ErrorFallback` in action. In a real application the
fallback only appears when genuine errors occur.

[6]
Creating a shape with an unknown type throws inside the editor, which is enough to trip the error
boundary. The `@ts-expect-error` is there because TypeScript rightly rejects the bad type.

[7]
Pass the components to the `Tldraw` component via the `components` prop.
*/
