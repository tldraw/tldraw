import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useYjsStore } from './useYjsStore'

export default function YjsExample() {
	const store = useYjsStore()

	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus store={store} />
		</div>
	)
}
