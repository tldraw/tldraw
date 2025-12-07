import { getErrorAnnotations, Tldraw, TLEditorComponents, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-error-capture.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLEditorComponents = {
	// [2]
	ErrorFallback: ({ error }) => {
		// [3]
		// eslint-disable-next-line local/no-at-internal
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
define them inside of the component, be sure to use a `useMemo` hook to prevent them from being
re-created on every component update.

[2]
The ErrorFallback component is displayed when a critical error occurs in the editor that would
otherwise crash the entire application. This is different from ShapeErrorFallback, which handles
errors in individual shapes only.

The ErrorFallback component receives an error prop that contains information about what went wrong.
You can customize this component to match your app's design and provide helpful recovery options to
your users.

[3]
Use getErrorAnnotations to retrieve additional debugging information that tldraw attaches to errors.
These annotations include tags (key-value pairs for categorization) and extras (additional context
data). This is particularly useful for error reporting services like Sentry.

[4]
Display the annotations in a scrollable pre element so developers can see the additional context.
In production, you might want to send these annotations to your error tracking service (like Sentry)
instead of displaying them to users.

[5]
For this example, we've added a button using the InFrontOfTheCanvas component that intentionally
triggers an error so you can see the custom ErrorFallback in action. In a real application, you
wouldn't need this - the ErrorFallback would only appear when genuine errors occur.

[6]
We trigger an error by attempting to create a shape with an invalid type. This simulates what would
happen if there was a critical error in the editor.

[7]
Pass your custom components to the Tldraw component via the components prop.
*/
