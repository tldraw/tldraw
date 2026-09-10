import { Box, createShapeId, Editor, TLComponents, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './zoom-to-bounds.css'

// There's a guide at the bottom of this file!

const zoomBox1 = new Box(50, 100, 900, 720)
const zoomBox2 = new Box(1000, 500, 500, 400)

function ZoomControls() {
	const editor = useEditor()
	return (
		<div className="tlui-menu control-panel">
			{/* [1] */}
			<TldrawUiButton type="normal" onClick={() => editor.zoomToBounds(zoomBox1, { inset: 72 })}>
				Zoom to violet box
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => editor.zoomToBounds(zoomBox2, { inset: 72, animation: { duration: 200 } })}
			>
				Zoom to blue box
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() =>
					editor.zoomToBounds(Box.Common([zoomBox1, zoomBox2]), {
						inset: 200,
						animation: { duration: 200 },
					})
				}
			>
				Zoom to both boxes
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: ZoomControls,
}

function handleMount(editor: Editor) {
	editor.createShapes([
		{
			id: createShapeId(),
			type: 'geo',
			x: zoomBox1.x,
			y: zoomBox1.y,
			isLocked: true,
			props: { w: zoomBox1.w, h: zoomBox1.h, color: 'violet' },
		},
		{
			id: createShapeId(),
			type: 'geo',
			x: zoomBox2.x,
			y: zoomBox2.y,
			isLocked: true,
			props: { w: zoomBox2.w, h: zoomBox2.h, color: 'blue' },
		},
	])
}

export default function ZoomToBoundsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components} />
		</div>
	)
}

/*
[1]
`zoomToBounds` fits the given page-space box into the viewport. The camera keeps the viewport's aspect
ratio, so the visible area is usually larger than the box you pass on one axis. `inset` is screen-space
padding around the box; when omitted the editor uses `options.zoomToFitPadding` (capped relative to the
viewport width). Pass `animation` to animate the move; without it the camera jumps.
*/
