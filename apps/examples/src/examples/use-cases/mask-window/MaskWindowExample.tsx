import { useEffect, useRef } from 'react'
import { TLComponents, TLShape, Tldraw, createShapeId, useEditor, useQuickReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import './mask-window.css'

function MaskWindow() {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	useQuickReactor(
		'clip',
		() => {
			const elm = ref.current
			if (!elm) return

			const rotation = editor.getSelectionRotation()
			const box = editor.getSelectionRotatedScreenBounds()

			if (!box) {
				// If there's nothing selected, clear the clip path
				elm.style.clipPath = ''
				return
			}

			const vsb = editor.getViewportScreenBounds()

			// Expand the box, offset it by the viewport screen bounds, and get the corners
			const { corners } = box.clone().translate(vsb.point.clone().neg()).expandBy(20)

			// Account for rotation by rotating the points of the rectangle
			const [tl, tr, br, bl] = corners.map((p) => p.rotWith(box.point, rotation))

			// Since there's no reliable "reverse clip path", we wind around the corners in order to turn our clip into a mask
			elm.style.clipPath = `polygon(0% 0%, ${tl.x}px 0%, ${tl.x}px ${tl.y}px, ${bl.x}px ${bl.y}px, ${br.x}px ${br.y}px, ${tr.x}px ${tr.y}px, ${tl.x}px ${tl.y}px, ${tl.x}px 0%, 100% 0%, 100% 100%, 0% 100%)`
		},
		[editor]
	)

	useExtraBonusStuff()

	return <div ref={ref} className="mask-fg" />
}

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		return <MaskWindow />
	},
}

export default function MaskWindowExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="mask" components={components} />
		</div>
	)
}

// Some extra stuff that isnt necessary but good for this demo
function useExtraBonusStuff() {
	const editor = useEditor()

	useEffect(() => {
		if (editor.getCurrentPageShapeIds().size === 0) {
			const vpb = editor.getViewportPageBounds()

			// if the canvas is empty, create some shapes for the demo
			for (let i = 0; i < 50; i++) {
				const x = vpb.x + Math.random() * vpb.w
				const y = vpb.y + Math.random() * vpb.h
				editor.createShape({ type: 'geo', x, y })
			}

			const id = createShapeId()
			const { center } = editor.getViewportPageBounds()
			editor.createShape({
				id,
				type: 'geo',
				x: center.x - 100,
				y: center.y - 100,
				props: {
					w: 200,
					h: 200,
				},
			})
			editor.select(id)
		}

		// As a (fragile) treat, press J to save positions for the selected shape, then press Ctrl+J to animate between positions
		const positions: TLShape[] = []

		const handleKeydown = (e: any) => {
			if (e.key === 'j') {
				e.preventDefault()
				e.stopPropagation()
				if (e.metaKey || e.ctrlKey) {
					const shape = positions.shift()
					if (!shape) return
					editor.animateShape(shape, { animation: { duration: 1000 } })
				} else {
					const shape = editor.getOnlySelectedShape()
					if (!shape) return
					positions.push(shape)
				}
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => {
			document.removeEventListener('keydown', handleKeydown)
		}
	}, [editor])
}
