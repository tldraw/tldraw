import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function HideUiExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="hide-ui-example" hideUi />
		</div>
	)
}

/* 
This example shows how to hide the UI of the editor. Simply pass the hideUi prop
to the Tldraw component. This is useful if you want to build your own UI around
the editor. See the custom ui example if you need help building your own UI.
*/
