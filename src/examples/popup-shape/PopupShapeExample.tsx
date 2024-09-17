import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { PopupShapeUtil } from './PopupShapeUtil'

const customShapeUtils = [PopupShapeUtil]

export default function PopupShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					for (let i = 0; i < 9; i++) {
						editor.createShape({
							type: 'my-popup-shape',
							x: (i % 3) * 220,
							y: Math.floor(i / 3) * 220,
						})
					}
					editor.zoomToBounds(editor.getCurrentPageBounds()!, { animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}
