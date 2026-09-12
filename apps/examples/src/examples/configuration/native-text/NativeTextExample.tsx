import { useState } from 'react'
import {
	downloadFile,
	Editor,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TLUiComponents,
	toRichText,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

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
						// [1]
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
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} onMount={createSampleShapes} />
		</div>
	)
}

/*
[1]
Native SVG export is separate from the default measurement strategy. Rasterizers must
have access to the fonts used by the SVG; the ordinary export menu keeps its defaults.
*/
