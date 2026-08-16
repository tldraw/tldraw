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
`hideUi` removes all of tldraw's default UI but keeps the editor, its tools, and its
keyboard shortcuts. Build your own controls on top with `useEditor()`; see the
custom UI example for a starting point.
*/
