import { useRef } from 'react'
import { Editor, TLComponents, Tldraw, createShapeId, useEditor, useQuickReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import './mask-window.css'

function MaskWindow() {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	// [1]
	useQuickReactor(
		'clip',
		() => {
			const elm = ref.current
			if (!elm) return

			const rotation = editor.getSelectionRotation()
			const box = editor.getSelectionRotatedScreenBounds()

			if (!box) {
				elm.style.clipPath = ''
				return
			}

			// [2]
			const vsb = editor.getViewportScreenBounds()
			const { corners } = box.clone().translate(vsb.point.clone().neg()).expandBy(20)
			const [tl, tr, br, bl] = corners.map((p) => p.rotWith(box.point, rotation))

			// [3]
			elm.style.clipPath = `polygon(0% 0%, ${tl.x}px 0%, ${tl.x}px ${tl.y}px, ${bl.x}px ${bl.y}px, ${br.x}px ${br.y}px, ${tr.x}px ${tr.y}px, ${tl.x}px ${tl.y}px, ${tl.x}px 0%, 100% 0%, 100% 100%, 0% 100%)`
		},
		[editor]
	)

	return <div ref={ref} className="mask-fg" />
}

const components: TLComponents = {
	InFrontOfTheCanvas: MaskWindow,
}

// Seed an empty canvas with some shapes and select one so the mask has something to show
function seedCanvas(editor: Editor) {
	if (editor.getCurrentPageShapeIds().size > 0) return

	const vpb = editor.getViewportPageBounds()
	for (let i = 0; i < 50; i++) {
		const x = vpb.x + Math.random() * vpb.w
		const y = vpb.y + Math.random() * vpb.h
		editor.createShape({ type: 'geo', x, y })
	}

	const id = createShapeId()
	editor.createShape({
		id,
		type: 'geo',
		x: vpb.center.x - 100,
		y: vpb.center.y - 100,
		props: { w: 200, h: 200 },
	})
	editor.select(id)
}

export default function MaskWindowExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="mask" components={components} onMount={seedCanvas} />
		</div>
	)
}

/*
[1]
`useQuickReactor` re-runs synchronously whenever the selection or camera changes, and writes
straight to the element's style, so the mask never lags a frame behind the selection.

[2]
`getSelectionRotatedScreenBounds` is in screen space relative to the page, so it is offset by
the viewport's screen position to get coordinates relative to the overlay element. The
corners are then rotated to match the selection's rotation.

[3]
CSS `clip-path` has no "everything except this" mode, so the polygon traces the outer edge of
the overlay, dips in to wind around the selection rectangle, and comes back out. The wound
region ends up outside the polygon and is therefore transparent.
*/
