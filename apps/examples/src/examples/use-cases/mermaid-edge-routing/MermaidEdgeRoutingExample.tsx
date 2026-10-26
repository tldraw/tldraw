import { useCallback } from 'react'
import {
	Editor,
	TLComponents,
	TLShapeId,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	toRichText,
	useAtom,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import '../hundred-mermaids/hundred-mermaids.css'
import mermaidDefinitions from '../hundred-mermaids/mermaids'

// [1]
const SECTIONS = [
	{ title: 'Flowcharts', group: 0, picks: [5, 10, 38], hasEdgeRouting: true },
	{ title: 'State diagrams', group: 1, picks: [4, 15, 19], hasEdgeRouting: true },
	{ title: 'Sequence diagrams', group: 2, picks: [0, 10, 22], hasEdgeRouting: false },
	{ title: 'Mindmaps', group: 3, picks: [10, 13, 18], hasEdgeRouting: false },
]
const COLUMNS = ['Normal arrows', 'Elbow arrows', 'Pele SVG']

const GAP_X = 160
const GAP_Y = 140
const CAPTION_GAP = 50
const SECTION_GAP = 120

const components: TLComponents = {
	TopPanel: TopPanel,
}

export default function MermaidEdgeRoutingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

function getTopLevelIds(editor: Editor) {
	return new Set(editor.getSortedChildIdsForParent(editor.getCurrentPageId()))
}

// [2]
async function drawDiagram(
	editor: Editor,
	definition: string,
	edgeRouting: 'arc' | 'elbow',
	y: number
) {
	const { createMermaidDiagram } = await import('@tldraw/mermaid')
	const before = getTopLevelIds(editor)
	await createMermaidDiagram(editor, definition, {
		edgeRouting,
		blueprintRender: { position: { x: 0, y }, centerOnPosition: false },
	})
	const ids = [...getTopLevelIds(editor)].filter((id) => !before.has(id))
	const bounds = editor.getShapesPageBounds(ids)
	return bounds ? { ids, w: bounds.w, h: bounds.h } : null
}

function moveRight(editor: Editor, ids: TLShapeId[], dx: number) {
	editor.updateShapes(
		ids.map((id) => {
			const shape = editor.getShape(id)!
			return { ...shape, x: shape.x + dx }
		})
	)
}

function caption(editor: Editor, text: string, x: number, y: number, size: 's' | 'm' | 'xl' = 's') {
	editor.createShape({ type: 'text', x, y, props: { richText: toRichText(text), size } })
}

async function placeSvg(editor: Editor, svg: string, x: number, y: number, height: number) {
	const doc = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
	const svgW = parseFloat(doc.getAttribute('width') || '100')
	const svgH = parseFloat(doc.getAttribute('height') || '100')
	const h = Math.max(height, 100)
	const w = (svgW * h) / svgH
	const asset = await editor.getAssetForExternalContent({
		type: 'file',
		file: new File([svg], 'diagram.svg', { type: 'image/svg+xml' }),
	})
	if (!asset) return
	if (!editor.getAsset(asset.id)) editor.createAssets([asset])
	editor.createShape({
		id: createShapeId(),
		type: 'image',
		x,
		y,
		props: { assetId: asset.id, w, h },
	})
}

function TopPanel() {
	const editor = useEditor()
	const isGeneratingAtom = useAtom('isGenerating', false)
	const isGenerating = useValue(isGeneratingAtom)

	const handleClick = useCallback(async () => {
		if (isGeneratingAtom.get()) return
		isGeneratingAtom.set(true)
		editor.deleteShapes([...editor.getCurrentPageShapeIds()])
		const { renderAsync } = await import('pele/lazy')

		try {
			// [3]
			const rows: {
				y: number
				h: number
				definition: string
				label: string
				arcs: { ids: TLShapeId[]; w: number; h: number } | null
				elbows: { ids: TLShapeId[]; w: number; h: number } | null
				hasEdgeRouting: boolean
			}[] = []
			const headers: { title: string; y: number }[] = []
			let y = 0
			for (const section of SECTIONS) {
				headers.push({ title: section.title, y })
				y += CAPTION_GAP * 2
				for (const index of section.picks) {
					const definition = mermaidDefinitions[section.group][index]
					const top = y + CAPTION_GAP
					const arcs = await drawDiagram(editor, definition, 'arc', top)
					const elbows = section.hasEdgeRouting
						? await drawDiagram(editor, definition, 'elbow', top)
						: null
					const h = Math.max(arcs?.h ?? 0, elbows?.h ?? 0, 100)
					rows.push({
						y,
						h,
						definition,
						label: `${section.title} #${index}`,
						arcs,
						elbows,
						hasEdgeRouting: section.hasEdgeRouting,
					})
					y = top + h + GAP_Y
				}
				y += SECTION_GAP
			}

			const arcsWidth = Math.max(...rows.map((row) => row.arcs?.w ?? 0))
			const elbowsWidth = Math.max(...rows.map((row) => row.elbows?.w ?? 0), 400)
			const columnX = [0, arcsWidth + GAP_X, arcsWidth + elbowsWidth + GAP_X * 2]

			for (const { title, y: headerY } of headers) {
				caption(editor, title, 0, headerY, 'xl')
				COLUMNS.forEach((column, i) =>
					caption(editor, column, columnX[i], headerY + CAPTION_GAP, 'm')
				)
			}

			for (const row of rows) {
				const top = row.y + CAPTION_GAP
				caption(editor, row.label, 0, row.y + 10)
				if (row.elbows) moveRight(editor, row.elbows.ids, columnX[1])
				if (!row.hasEdgeRouting) {
					caption(
						editor,
						'Same as normal arrows: only flowcharts and state diagrams route edges',
						columnX[1],
						top
					)
				}
				try {
					const { svg } = await renderAsync(row.definition)
					await placeSvg(editor, svg, columnX[2], top, row.arcs?.h ?? row.h)
				} catch (e) {
					console.warn('[pele svg] failed:', e)
				}
			}
		} finally {
			isGeneratingAtom.set(false)
		}

		editor.selectNone()
		editor.zoomToFit()
	}, [editor, isGeneratingAtom])

	return (
		<div className="hundred-mermaids-panel" style={{ opacity: isGenerating ? 0 : 1 }}>
			<TldrawUiButton type="low" onClick={handleClick}>
				Compare edge routing
			</TldrawUiButton>
		</div>
	)
}

/*
[1]
Three diagrams of each type from the "Hundreds of Mermaid diagrams" example: a simple one, one
that branches, and a harder one with subgraphs, composite states, nested frames or repeated names.
Elbow routing only changes flowcharts and state diagrams, so the other types skip that column.

[2]
`edgeRouting` is an experimental, internal option of `createMermaidDiagram`. Each diagram is
drawn at the left edge of its row, measured, then moved into its column once every column's
width is known.

[3]
Rows are laid out top to bottom as each is drawn, since a row's height is only known once its
diagrams exist. Columns are lined up afterwards.
*/
