import { useCallback } from 'react'
import {
	Editor,
	TLComponents,
	TLShapeId,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	useAtom,
	useEditor,
	useValue,
} from 'tldraw'
import mermaidDefinitions from './mermaids'

const GAP = 100
const PAIR_GAP = 40

const components: TLComponents = {
	TopPanel: TopPanel,
}

export default function MermaidDiagramsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

function getNewShapeIds(editor: Editor, shapesBefore: Set<TLShapeId>): TLShapeId[] {
	return [...editor.getCurrentPageShapeIds()].filter((id) => !shapesBefore.has(id))
}

function measureSelection(editor: Editor) {
	const bounds = editor.getSelectionPageBounds()
	return bounds ? { w: bounds.width, h: bounds.height } : { w: 0, h: 0 }
}

function parseSvgSize(svgText: string): { w: number; h: number } {
	const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml').querySelector('svg')
	if (!svg) return { w: 100, h: 100 }
	let w = parseFloat(svg.getAttribute('width') || '0')
	let h = parseFloat(svg.getAttribute('height') || '0')
	if (!(w && h)) {
		const vb = svg.getAttribute('viewBox')?.split(/\s+/).map(Number)
		if (vb && vb.length === 4) {
			w = vb[2]
			h = vb[3]
		}
	}
	return { w: w || 100, h: h || 100 }
}

function TopPanel() {
	const editor = useEditor()
	const isGeneratingAtom = useAtom<boolean>('isGenerating', false)
	const isGenerating = useValue(isGeneratingAtom)
	const countAtom = useAtom<number>('mermaidCount', 0)
	const count = useValue(countAtom)
	const handleClick = useCallback(async () => {
		if (isGeneratingAtom.get()) {
			return
		}
		countAtom.set(0)
		isGeneratingAtom.set(true)
		const [{ createMermaidDiagram }, { default: mermaid }] = await Promise.all([
			import('@tldraw/mermaid'),
			import('mermaid'),
		])
		const FONT_INFLATE = 1.4
		mermaid.initialize({
			startOnLoad: false,
			flowchart: { useMaxWidth: false, nodeSpacing: 80, rankSpacing: 80, padding: 20 },
			state: { useMaxWidth: false, nodeSpacing: 80, rankSpacing: 80, padding: 20 },
			sequence: { useMaxWidth: false, actorMargin: 50, noteMargin: 20 },
			themeVariables: { fontSize: `${18 * FONT_INFLATE}px` },
		})

		const offscreen = document.createElement('div')
		offscreen.style.cssText = 'position:absolute;left:-9999px;top:-9999px;overflow:hidden'
		document.body.appendChild(offscreen)

		editor.selectAll()
		editor.deleteShapes(editor.getSelectedShapes())

		await (new Promise((resolve) => setTimeout(resolve, 1000) ));

		let currentX = 0,
			currentY = 0

		try {
			for (const group of mermaidDefinitions) {
				currentX = 0
				let maxRowHeight = 0

				for (const def of group) {
					const shapesBefore = new Set(editor.getCurrentPageShapeIds())
					let nativeSize = { w: 0, h: 0 }

					try {
						await createMermaidDiagram(editor, def, {
							blueprintRender: {
								position: { x: currentX, y: currentY },
								centerOnPosition: false,
							},
						})

						const nativeIds = getNewShapeIds(editor, shapesBefore)
						if (nativeIds.length) {
							editor.setSelectedShapes(nativeIds)
						}
						nativeSize = measureSelection(editor)
						currentX += nativeSize.w + PAIR_GAP
					} catch (e) {
						console.warn('[mermaid] blueprint failed:', e, '\n---\n' + def)
					}

					try {
						const { svg } = await mermaid.render(
							`mmd-svg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
							def,
							offscreen
						)

						const { w: svgW, h: svgH } = parseSvgSize(svg)
						const scale = nativeSize.h > 0 && svgH > 0 ? nativeSize.h / svgH : 1
						const scaledW = svgW * scale
						const scaledH = svgH * scale

						const asset = await editor.getAssetForExternalContent({
							type: 'file',
							file: new File([svg], 'diagram.svg', { type: 'image/svg+xml' }),
						})
						if (asset) {
							const shapeId = createShapeId()
							if (!editor.getAsset(asset.id)) {
								editor.createAssets([asset])
							}
							editor.createShape({
								id: shapeId,
								type: 'image',
								x: currentX,
								y: currentY,
								props: { assetId: asset.id, w: scaledW, h: scaledH },
							})
						}

						currentX += scaledW + GAP
						maxRowHeight = Math.max(maxRowHeight, nativeSize.h, scaledH)
					} catch (e) {
						console.warn('[mermaid] svg render failed:', e, '\n---\n' + def)
						currentX += GAP - PAIR_GAP
						maxRowHeight = Math.max(maxRowHeight, nativeSize.h)
					}

					countAtom.set(countAtom.get() + 1)
				}

				currentY += maxRowHeight + GAP
			}
		} finally {
			offscreen.remove()
			isGeneratingAtom.set(false)
		}

		editor.selectNone()
	}, [editor, isGeneratingAtom, countAtom])

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: '50%',
				transform: 'translateX(-50%)',
				padding: '8px',
				background: '#eee',
				borderRadius: '0 0 8px 8px',
				display: 'flex',
				gap: '8px',
				zIndex: 1000,
				opacity: isGenerating ? 0 : 1,
			}}
		>
			<TldrawUiButton type="low" onClick={handleClick}>
				Click to see a thousand mermaids
				{count > 0 && <>({count} actually…)</>}
			</TldrawUiButton>
		</div>
	)
}
