import { useEffect, useRef, useState } from 'react'
import {
	TLComponents,
	TLGeoShape,
	TLShape,
	Tldraw,
	createShapeId,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './soft-clip.css'

const SOFT_CLIP_META_KEY = 'softClip'

function isSoftClipShape(shape: TLShape) {
	return shape.type === 'geo' && shape.meta?.[SOFT_CLIP_META_KEY] === true
}

function SoftClipOverlay({ opacity }: { opacity: number }) {
	const editor = useEditor()
	const pathRef = useRef<SVGPathElement>(null)

	useQuickReactor(
		'soft clip overlay',
		() => {
			const path = pathRef.current
			if (!path) return

			const vsb = editor.getViewportScreenBounds()
			const clipShapes = editor.getCurrentPageShapes().filter(isSoftClipShape)

			if (clipShapes.length === 0) {
				path.setAttribute('d', '')
				return
			}

			// Outer subpath wraps the viewport; each clip shape adds an inner subpath.
			// With fill-rule="evenodd" the inner subpaths punch holes in the dim layer.
			let d = `M0,0 L${vsb.w},0 L${vsb.w},${vsb.h} L0,${vsb.h} Z`

			for (const shape of clipShapes) {
				const geo = editor.getShapeGeometry(shape)
				const pageTransform = editor.getShapePageTransform(shape)
				if (!pageTransform || geo.vertices.length === 0) continue

				const pagePts = pageTransform.applyToPoints(geo.vertices)
				const screenPts = pagePts.map((p) => editor.pageToScreen(p))

				d += ` M${(screenPts[0].x - vsb.x).toFixed(2)},${(screenPts[0].y - vsb.y).toFixed(2)}`
				for (let i = 1; i < screenPts.length; i++) {
					d += ` L${(screenPts[i].x - vsb.x).toFixed(2)},${(screenPts[i].y - vsb.y).toFixed(2)}`
				}
				d += ' Z'
			}

			path.setAttribute('d', d)
		},
		[editor]
	)

	return (
		<svg className="soft-clip-overlay">
			<path ref={pathRef} fillRule="evenodd" fillOpacity={1 - opacity} />
		</svg>
	)
}

function SoftClipControls({
	opacity,
	onOpacityChange,
}: {
	opacity: number
	onOpacityChange(value: number): void
}) {
	const editor = useEditor()
	const selectedGeoShapes = useValue(
		'selected geo shapes',
		() => editor.getSelectedShapes().filter((s): s is TLGeoShape => s.type === 'geo'),
		[editor]
	)

	const allMarked =
		selectedGeoShapes.length > 0 &&
		selectedGeoShapes.every((s) => s.meta?.[SOFT_CLIP_META_KEY] === true)

	return (
		<div className="soft-clip-controls">
			<label className="soft-clip-slider">
				<span>Opacity</span>
				<input
					type="range"
					min={0}
					max={100}
					value={Math.round(opacity * 100)}
					onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
				/>
				<span className="soft-clip-slider-value">{Math.round(opacity * 100)}%</span>
			</label>
			{selectedGeoShapes.length > 0 && (
				<button
					onClick={() => {
						editor.updateShapes(
							selectedGeoShapes.map((s) => ({
								id: s.id,
								type: s.type,
								meta: { ...s.meta, [SOFT_CLIP_META_KEY]: !allMarked },
							}))
						)
					}}
				>
					{allMarked ? 'Disable soft clip' : 'Enable soft clip'}
				</button>
			)}
		</div>
	)
}

function SoftClipUI() {
	const [opacity, setOpacity] = useState(0.3)
	return (
		<>
			<SoftClipOverlay opacity={opacity} />
			<SoftClipControls opacity={opacity} onOpacityChange={setOpacity} />
		</>
	)
}

function SetupDemoShapes() {
	const editor = useEditor()
	useEffect(() => {
		if (editor.getCurrentPageShapeIds().size > 0) return

		const { center } = editor.getViewportPageBounds()

		editor.createShapes([
			{
				type: 'geo',
				x: center.x - 280,
				y: center.y - 200,
				props: { geo: 'rectangle', w: 160, h: 110, color: 'blue', fill: 'semi' },
			},
			{
				type: 'geo',
				x: center.x + 80,
				y: center.y - 220,
				props: { geo: 'ellipse', w: 130, h: 130, color: 'yellow', fill: 'semi' },
			},
			{
				type: 'geo',
				x: center.x - 240,
				y: center.y + 30,
				props: { geo: 'triangle', w: 150, h: 140, color: 'green', fill: 'semi' },
			},
			{
				type: 'geo',
				x: center.x + 60,
				y: center.y + 40,
				props: { geo: 'star', w: 150, h: 140, color: 'violet', fill: 'semi' },
			},
		])

		const clipId = createShapeId()
		editor.createShape({
			id: clipId,
			type: 'geo',
			x: center.x - 180,
			y: center.y - 180,
			props: { geo: 'ellipse', w: 360, h: 360, color: 'black', fill: 'none' },
			meta: { [SOFT_CLIP_META_KEY]: true },
		})
		editor.select(clipId)
	}, [editor])
	return null
}

const components: TLComponents = {
	InFrontOfTheCanvas: SoftClipUI,
}

export default function SoftClipExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="soft-clip" components={components}>
				<SetupDemoShapes />
			</Tldraw>
		</div>
	)
}
