import { Tldraw, TLEditorComponents } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLEditorComponents = {
	Background: () => {
		return <div style={{ position: 'absolute', inset: 0, backgroundColor: '#f0f8ff' }} />
	},
}

export default function CustomComponentsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="custom-components-example" components={components} />
		</div>
	)
}

/*
The `components` prop replaces the background, grid, cursors, shape indicators, and more. See
`TLEditorComponents` for the full list.

[1]
Define the components object outside the React component so it's a stable reference. Here we
replace the `Background` component with a plain div in a light blue color. Passing `null` for a
component hides it entirely.
*/
