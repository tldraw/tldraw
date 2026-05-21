import {
	DRAW_ELEMENT_IMAGE_FLAG_HINT,
	exportShapesViaDrawElementImage,
	isDrawElementImageSupported,
	Tldraw,
	TLUiComponents,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { HTML_IN_CANVAS_SHAPE, HtmlInCanvasShapeUtil } from './HtmlInCanvasShapeUtil'

const customShapeUtils = [HtmlInCanvasShapeUtil]

function ExportPanel() {
	const editor = useEditor()
	const supported = isDrawElementImageSupported()

	const downloadBlob = (blob: Blob, filename: string) => {
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		link.click()
		URL.revokeObjectURL(url)
	}

	return (
		<div
			style={{
				pointerEvents: 'all',
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				padding: 12,
				background: 'var(--color-panel)',
				borderRadius: 8,
				margin: 8,
				maxWidth: 320,
				fontFamily: 'system-ui, sans-serif',
				fontSize: 13,
			}}
		>
			<div>
				<strong>drawElementImage:</strong>{' '}
				<span style={{ color: supported ? 'green' : 'crimson' }}>
					{supported ? 'available' : 'unavailable'}
				</span>
			</div>
			{!supported && <div style={{ color: 'crimson' }}>{DRAW_ELEMENT_IMAGE_FLAG_HINT}</div>}

			<button
				type="button"
				disabled={!supported}
				onClick={async () => {
					const shapeIds = [...editor.getCurrentPageShapeIds()]
					if (shapeIds.length === 0) return alert('No shapes on the canvas')
					const result = await exportShapesViaDrawElementImage(editor, shapeIds, {
						pixelRatio: 2,
					})
					if (!result) {
						alert('drawElementImage export returned null. ' + DRAW_ELEMENT_IMAGE_FLAG_HINT)
						return
					}
					if (result.skippedShapeIds.length) {
						console.warn('Skipped (not mounted):', result.skippedShapeIds)
					}
					downloadBlob(result.blob, 'html-in-canvas-export.png')
				}}
			>
				Export via drawElementImage
			</button>

			<button
				type="button"
				onClick={async () => {
					const shapeIds = [...editor.getCurrentPageShapeIds()]
					if (shapeIds.length === 0) return alert('No shapes on the canvas')
					const { blob } = await editor.toImage(shapeIds, {
						format: 'png',
						background: false,
					})
					downloadBlob(blob, 'standard-export.png')
				}}
			>
				Export via standard PNG (foreignObject)
			</button>
		</div>
	)
}

const components: TLUiComponents = {
	SharePanel: ExportPanel,
}

export default function HtmlInCanvasShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) {
						editor.createShape({
							type: HTML_IN_CANVAS_SHAPE,
							x: 120,
							y: 120,
						})
					}
				}}
			/>
		</div>
	)
}
