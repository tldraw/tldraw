import { ArrowShape } from '@tldraw/shapes'
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="tldraw_example"
				autoFocus
				shapes={{ arrow: ArrowShape }}
				tools={[ArrowShape.tool]}
			/>
		</div>
	)
}
