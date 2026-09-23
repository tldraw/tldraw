import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { CustomRenderer } from './CustomRenderer'
import './custom-renderer.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLComponents = {
	Background: CustomRenderer,
}

export default function CustomRendererExample() {
	return (
		// [2]
		<div className="tldraw__editor custom-renderer">
			<Tldraw persistenceKey="custom-renderer-example" components={components} />
		</div>
	)
}

/*
The shapes are drawn to a 2d canvas from the editor's shape data instead of being rendered by
React.

[1]
We replace the `Background` component with our custom renderer (see `CustomRenderer.tsx`). It
reads the rendering shapes from the editor on every animation frame and draws them itself. Even
though the DOM shapes are hidden, tldraw still does the work of figuring out which shapes to
render. In a real app you might set the `Canvas` component to null and render everything yourself.

[2]
The `.custom-renderer` class hides tldraw's regular shapes layer via CSS (see
`custom-renderer.css`) so only our canvas rendering is visible. Selection, handles, and the
rest of the UI still work as normal.
*/
