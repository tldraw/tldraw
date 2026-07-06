import { Editor, PageRecordType, TLPageId, Tldraw, createShapeId } from 'tldraw'
import { PropertiesPanel } from './properties-panel'
import { LoadedSketchbook, sketchbooks } from './registry'
import { SketchShape, SketchShapeUtil } from './sketch-shape'

const CELL_W = 300
const CELL_H = 220
const GAP = 28
const PAD = 40
const TITLE_H = 44

const namespaceOf = (title: string) => title.split('/')[0]

// A frame is labelled by the title minus its namespace (the page already names it).
function frameName(title: string) {
	const parts = title.split('/')
	return parts.length > 1 ? parts.slice(1).join('/') : title
}

// Lay a group of sketchbooks out as named frames stacked vertically, each holding
// its sketches as instances in a row.
function layoutGroup(editor: Editor, books: LoadedSketchbook[]) {
	let y = PAD
	for (const book of books) {
		const n = book.sketches.length
		const frameW = n * CELL_W + (n - 1) * GAP + PAD * 2
		const frameH = TITLE_H + CELL_H + PAD
		const frameId = createShapeId()

		editor.createShape({
			id: frameId,
			type: 'frame',
			x: PAD,
			y,
			props: { w: frameW, h: frameH, name: frameName(book.title) },
		})

		book.sketches.forEach((s, i) => {
			editor.createShape<SketchShape>({
				type: 'sketch',
				parentId: frameId,
				x: PAD + i * (CELL_W + GAP),
				y: TITLE_H,
				props: { w: CELL_W, h: CELL_H, sketchId: s.id, args: { ...(s.sketch.args ?? {}) } },
			})
		})

		y += frameH + GAP
	}
}

// One tldraw page per top-level namespace, so e.g. all `Comments/*` sketchbooks
// live on their own page.
function layoutSketches(editor: Editor) {
	// Guard against a second run (StrictMode remount / HMR).
	if (editor.getCurrentPageShapeIds().size > 0) return

	const namespaces = [...new Set(sketchbooks.map((b) => namespaceOf(b.title)))].sort()
	const defaultPageId = editor.getCurrentPageId()
	const pageIds = new Map<string, TLPageId>()

	namespaces.forEach((ns, i) => {
		if (i === 0) {
			editor.renamePage(defaultPageId, ns)
			pageIds.set(ns, defaultPageId)
		} else {
			const id = PageRecordType.createId()
			editor.createPage({ id, name: ns })
			pageIds.set(ns, id)
		}
	})

	for (const ns of namespaces) {
		const pageId = pageIds.get(ns)
		if (!pageId) continue
		editor.setCurrentPage(pageId)
		layoutGroup(
			editor,
			sketchbooks.filter((b) => namespaceOf(b.title) === ns)
		)
	}

	editor.setCurrentPage(defaultPageId)
	editor.zoomToFit()
}

export function CanvasStudio() {
	return (
		<div className="canvas-root">
			<Tldraw shapeUtils={[SketchShapeUtil]} onMount={layoutSketches}>
				<PropertiesPanel />
			</Tldraw>
		</div>
	)
}
