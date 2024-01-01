import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ReadOnlyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_example"
				onMount={(editor) => {
					editor.updateInstanceState({ isReadonly: true })
				}}
			/>
		</div>
	)
}
