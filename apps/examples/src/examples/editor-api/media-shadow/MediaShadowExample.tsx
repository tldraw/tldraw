import { CSSProperties, useCallback, useState } from 'react'
import {
	AssetRecordType,
	DefaultBorderStyle,
	Editor,
	TLDefaultBorderStyle,
	TLShapePartial,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const BORDERS: TLDefaultBorderStyle[] = ['none', 'solid', 'shadow', 'shadow-hard']

export default function MediaShadowExample() {
	// [1]
	const [editor, setEditor] = useState<Editor | null>(null)
	const [offsetX, setOffsetX] = useState(4)
	const [offsetY, setOffsetY] = useState(4)
	const [blur, setBlur] = useState(4)
	const [opacity, setOpacity] = useState(0.5)

	const handleMount = useCallback((editor: Editor) => {
		setEditor(editor)

		// [2]
		const assetId = AssetRecordType.createId()
		const w = 480
		const h = 270
		editor.createAssets([
			{
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'tldraw.png',
					src: '/tldraw.png',
					w,
					h,
					mimeType: 'image/png',
					isAnimated: false,
				},
				meta: {},
			},
		])

		// [3]
		editor.createShape({
			type: 'image',
			x: 180,
			y: 160,
			props: { assetId, w, h, border: 'shadow' },
		})
		editor.setStyleForNextShapes(DefaultBorderStyle, 'shadow')
	}, [])

	// [4]
	const applyBorder = useCallback(
		(border: TLDefaultBorderStyle) => {
			if (!editor) return
			editor.run(() => {
				const updates = editor
					.getCurrentPageShapes()
					.filter((shape) => shape.type === 'image' || shape.type === 'video')
					.map((shape): TLShapePartial => ({ id: shape.id, type: shape.type, props: { border } }))
				editor.updateShapes(updates)
				editor.setStyleForNextShapes(DefaultBorderStyle, border)
			})
		},
		[editor]
	)

	// [5]
	const cssVars = {
		'--tl-media-shadow-x': `${offsetX}px`,
		'--tl-media-shadow-y': `${offsetY}px`,
		'--tl-media-shadow-blur': `${blur}px`,
		'--tl-media-shadow-opacity': opacity,
	} as CSSProperties

	return (
		<div className="tldraw__editor" style={cssVars}>
			<Tldraw onMount={handleMount} />
			<div
				style={{
					position: 'absolute',
					top: 56,
					left: 8,
					zIndex: 1000,
					display: 'flex',
					flexDirection: 'column',
					gap: 12,
					padding: 12,
					width: 240,
					background: 'var(--color-panel, white)',
					border: '1px solid var(--color-divider, #e8e8e8)',
					borderRadius: 8,
					boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
					font: '12px/1.4 system-ui, sans-serif',
				}}
				onPointerDown={(e) => e.stopPropagation()}
			>
				<strong>Shadow playground</strong>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
					{BORDERS.map((border) => (
						<button key={border} onClick={() => applyBorder(border)} style={{ flex: '1 0 auto' }}>
							{border}
						</button>
					))}
				</div>
				<Slider
					label="Offset X"
					value={offsetX}
					min={-40}
					max={40}
					step={1}
					onChange={setOffsetX}
				/>
				<Slider
					label="Offset Y"
					value={offsetY}
					min={-40}
					max={40}
					step={1}
					onChange={setOffsetY}
				/>
				<Slider label="Blur" value={blur} min={0} max={40} step={1} onChange={setBlur} />
				<Slider label="Opacity" value={opacity} min={0} max={1} step={0.05} onChange={setOpacity} />
			</div>
		</div>
	)
}

function Slider({
	label,
	value,
	min,
	max,
	step,
	onChange,
}: {
	label: string
	value: number
	min: number
	max: number
	step: number
	onChange(value: number): void
}) {
	return (
		<label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<span style={{ display: 'flex', justifyContent: 'space-between' }}>
				<span>{label}</span>
				<span>{value}</span>
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
		</label>
	)
}

/*
This example is a playground for tuning the drop shadow used by the media `border`
style. Image and video shapes have a `border` shared style prop with the values
`none`, `solid`, `shadow`, and `shadow-hard`. The `shadow` variants render a CSS
`drop-shadow` filter whose values are read from CSS custom properties, so you can
tweak them live here without rebuilding.

[1] We keep the editor instance and the shadow parameters in React state.

[2] Create an image asset pointing at the static `/tldraw.png` file.

[3] Create an image shape that uses the asset, and default new shapes to `shadow`.

[4] The border buttons apply a border value to every image/video on the page and
set it as the default for the next shape. You can also use the style panel.

[5] The sliders set the `--tl-media-shadow-*` CSS variables on the editor
container. The shape's `drop-shadow` filter reads these variables, so changes
apply instantly. Once we settle on values we like, they become the baked-in
defaults (and the matching values for SVG/PNG export).
*/
