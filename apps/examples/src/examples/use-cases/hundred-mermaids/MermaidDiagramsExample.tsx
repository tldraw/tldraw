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
import 'tldraw/tldraw.css'
import './hundred-mermaids.css'
import mermaidDefinitions from './mermaids'

const GAP = 100
const PAIR_GAP = 40

// [1]
const MERMAID_CONFIG = {
	flowchart: { useMaxWidth: false },
	state: { useMaxWidth: false },
	mindmap: { useMaxWidth: false },
	sequence: { useMaxWidth: false },
}

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

		// [2]
		const [{ createMermaidDiagram }, { default: mermaid }] = await Promise.all([
			import('@tldraw/mermaid'),
			import('mermaid'),
		])

		const offscreen = document.createElement('div')
		offscreen.style.cssText = 'position:absolute;left:-9999px;top:-9999px;overflow:hidden'
		document.body.appendChild(offscreen)

		editor.deleteShapes([...editor.getCurrentPageShapeIds()])

		let currentX = 0
		let currentY = 0

		try {
			for (const group of mermaidDefinitions) {
				currentX = 0
				let maxRowHeight = 0

				for (const def of group) {
					const shapesBefore = new Set(editor.getCurrentPageShapeIds())
					let nativeSize = { w: 0, h: 0 }

					// [3]
					try {
						await createMermaidDiagram(editor, def, {
							mermaidConfig: MERMAID_CONFIG,
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

					// [4]
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
							if (!editor.getAsset(asset.id)) {
								editor.createAssets([asset])
							}
							editor.createShape({
								id: createShapeId(),
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
		<div className="hundred-mermaids-panel" style={{ opacity: isGenerating ? 0 : 1 }}>
			<TldrawUiButton type="low" onClick={handleClick}>
				Click to see a thousand mermaids
				{count > 0 && <>({count} actually…)</>}
			</TldrawUiButton>
		</div>
	)
}

/*
[1]
Mermaid's `useMaxWidth` makes rendered SVGs stretch to their container. We turn it off so
the SVG we render for comparison has an intrinsic size we can read back. `createMermaidDiagram`
merges `mermaidConfig` over its own defaults and calls `mermaid.initialize` for us.

[2]
Both `@tldraw/mermaid` and mermaid itself are large, so they are loaded on first click rather
than on page load.

[3]
`createMermaidDiagram` parses the Mermaid source and creates native tldraw shapes (geo shapes,
arrows, text) at the given position. We diff the page's shape ids before and after to find what
it created so we can measure it and lay out the next diagram.

[4]
For comparison, the same source is also rendered by Mermaid to an SVG, which is turned into an
image asset and placed next to the native version at the same height.
*/
