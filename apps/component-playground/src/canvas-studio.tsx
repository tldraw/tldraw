import { Editor, PageRecordType, TLPageId, Tldraw, createShapeId } from 'tldraw'
import { PropertiesPanel } from './properties-panel'
import { LoadedSketchbook, sketchbooks } from './registry'
import { SketchShape, SketchShapeUtil } from './sketch-shape'

const CELL_W = 320
const CELL_H = 280
const GAP = 28
const PAD = 40
const TITLE_H = 44
const COLS = 3 // max sketches per row inside a frame
const MAX_ROW = 1500 // frames wrap to a new row past this width

const namespaceOf = (title: string) => title.split('/')[0]

// A frame is labelled by the title minus its namespace (the page already names it).
function frameName(title: string) {
	const parts = title.split('/')
	return parts.length > 1 ? parts.slice(1).join('/') : title
}

function frameSize(count: number) {
	const cols = Math.min(count, COLS)
	const rows = Math.ceil(count / COLS)
	const w = cols * CELL_W + (cols - 1) * GAP + PAD * 2
	const h = TITLE_H + rows * CELL_H + (rows - 1) * GAP + PAD
	return { w, h }
}

// Lay sketchbooks out as named frames: sketches wrap into a grid inside each frame,
// and frames shelf-pack left-to-right, wrapping to a new row past MAX_ROW.
function layoutGroup(editor: Editor, books: LoadedSketchbook[]) {
	let cursorX = PAD
	let cursorY = PAD
	let rowHeight = 0

	for (const book of books) {
		const { w: frameW, h: frameH } = frameSize(book.sketches.length)

		if (cursorX > PAD && cursorX + frameW > MAX_ROW) {
			cursorX = PAD
			cursorY += rowHeight + GAP
			rowHeight = 0
		}

		const frameId = createShapeId()
		editor.createShape({
			id: frameId,
			type: 'frame',
			x: cursorX,
			y: cursorY,
			props: { w: frameW, h: frameH, name: frameName(book.title) },
		})

		book.sketches.forEach((s, i) => {
			const col = i % COLS
			const row = Math.floor(i / COLS)
			editor.createShape<SketchShape>({
				type: 'sketch',
				parentId: frameId,
				x: PAD + col * (CELL_W + GAP),
				y: TITLE_H + row * (CELL_H + GAP),
				props: { w: CELL_W, h: CELL_H, sketchId: s.id, args: { ...(s.sketch.args ?? {}) } },
			})
		})

		cursorX += frameW + GAP
		rowHeight = Math.max(rowHeight, frameH)
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
