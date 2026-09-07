import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { createCanvasMeasureContext, installMeasureContext } from '@tldraw/rich-text-layout'
import { useEffect, useState } from 'react'
import {
	allDefaultFontFaces,
	createTldrawTextMeasurer,
	downloadFile,
	Editor,
	Tldraw,
	TldrawTextMeasurer,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TLUiComponents,
	toRichText,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

const assetUrls = getAssetUrlsByImport()
let preparation: Promise<TldrawTextMeasurer> | undefined

// [1]
function prepareTextMeasurer() {
	return (preparation ??= (async () => {
		await Promise.all(
			allDefaultFontFaces.map(async (font) => {
				const url = assetUrls.fonts[font.src.url as keyof typeof assetUrls.fonts]
				const face = new FontFace(font.family, `url(${JSON.stringify(url)})`, {
					weight: font.weight,
					style: font.style,
				})
				document.fonts.add(await face.load())
			})
		)
		const context = document.createElement('canvas').getContext('2d')
		if (!context) throw new Error('Native text measurement needs a 2D canvas context')
		const measureContext = createCanvasMeasureContext(context)
		await installMeasureContext(measureContext)
		return createTldrawTextMeasurer({ measureContext })
	})())
}

function ExportNativeSvg() {
	const editor = useEditor()
	const [error, setError] = useState<string>()
	return (
		<div className="tlui-menu">
			<TldrawUiButton
				type="normal"
				onClick={async () => {
					setError(undefined)
					try {
						// [2]
						const result = await editor.getSvgString([...editor.getCurrentPageShapeIds()], {
							text: 'native',
							background: true,
						})
						if (!result) return
						downloadFile(new File([result.svg], 'native-text.svg', { type: 'image/svg+xml' }))
					} catch (error) {
						setError(String(error))
					}
				}}
			>
				<TldrawUiButtonLabel>Export native SVG</TldrawUiButtonLabel>
			</TldrawUiButton>
			{error && <div role="alert">{error}</div>}
		</div>
	)
}

const components: TLUiComponents = { SharePanel: ExportNativeSvg }

function createSampleShapes(editor: Editor) {
	editor.createShapes([
		{
			type: 'text',
			x: 60,
			y: 60,
			props: {
				richText: toRichText('Native text measurement\nPaste rich text here and try resizing it.'),
				font: 'sans',
				autoSize: false,
				w: 440,
			},
		},
		{
			type: 'geo',
			x: 60,
			y: 220,
			props: {
				w: 220,
				h: 140,
				richText: toRichText('A shape with a wrapping label'),
				font: 'serif',
			},
		},
		{
			type: 'note',
			x: 340,
			y: 220,
			props: { richText: toRichText('A sticky note\nwith multiple lines') },
		},
		{
			type: 'arrow',
			x: 60,
			y: 500,
			props: {
				start: { x: 0, y: 0 },
				end: { x: 420, y: 0 },
				richText: toRichText('An arrow label'),
				font: 'mono',
			},
		},
		{ type: 'frame', x: 620, y: 220, props: { w: 240, h: 220, name: 'A frame heading' } },
	])
	editor.zoomToFit()
}

export default function NativeTextExample() {
	const [textMeasurer, setTextMeasurer] = useState<TldrawTextMeasurer>()
	const [error, setError] = useState<string>()
	useEffect(() => {
		let cancelled = false
		prepareTextMeasurer().then(
			(measurer) => {
				if (!cancelled) setTextMeasurer(measurer)
			},
			(error) => {
				if (!cancelled) setError(String(error))
			}
		)
		return () => {
			cancelled = true
		}
	}, [])

	return (
		<div className="tldraw__editor">
			{error ? (
				<div role="alert">{error}</div>
			) : textMeasurer ? (
				<Tldraw
					assetUrls={assetUrls}
					textMeasurer={textMeasurer}
					components={components}
					onMount={createSampleShapes}
				/>
			) : (
				<div role="status">Loading text engine and fonts…</div>
			)}
		</div>
	)
}

/*
[1]
Load fonts and await installMeasureContext before mounting the editor. Otherwise the
synchronous layout calls can run before pretext is ready or cache fallback font widths.
The shared promise also keeps preparation stable across React Strict Mode mounts.

[2]
The export reuses the injected measurer and emits SVG text elements. Other export actions
keep their default behavior. Rasterizers must have access to the fonts used by the SVG.
*/
