import { Tldraw } from '@tldraw/tldraw'
import 'tldraw/tldraw.css'

import { MyShapeUtil } from './MyShapeUtil'

export default function CustomShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[MyShapeUtil]}
				onMount={(editor) => {
					editor.createShape({ type: 'my-custom-shape', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}
