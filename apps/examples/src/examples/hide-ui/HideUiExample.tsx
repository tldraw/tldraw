import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function HideUiExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="hide-ui-example" hideUi />
		</div>
	)
}
