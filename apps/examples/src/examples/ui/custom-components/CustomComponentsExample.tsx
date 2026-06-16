import { Tldraw, TLEditorComponents } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

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
This example shows how to change the default components that tldraw uses on the canvas via the `components` prop.
Components include things like the background, grid, cursor, selection background, and more.
In this case we change the canvas background to a light blue color.
*/
