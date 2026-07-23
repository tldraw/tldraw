import { Editor, PageRecordType, TLPageId, Tldraw, createShapeId } from 'tldraw'
import { PropertiesPanel } from './properties-panel'
import { LoadedSketch, LoadedSketchbook, sketchbooks } from './registry'
import { SketchShape, SketchShapeUtil } from './sketch-shape'
import { VIEWPORTS } from './viewports'

const CELL_W = 320
const CELL_H = 280
const GAP = 28
const PAD = 40
const TITLE_H = 44
const LABEL_H = 30 // caption strip under each cell (matches sketch-shape.css)
const FRAME_LABEL_H = 40 // the frame name renders above the frame; reserve room for it
const COLS = 3 // max sketches per row inside a component frame
const MAX_ROW = 1500 // frames wrap to a new row past this width

const namespaceOf = (title: string) => title.split('/')[0]

// A frame is labelled by the title minus its namespace (the page already names it).
function frameName(title: string) {
	const parts = title.split('/')
	return parts.length > 1 ? parts.slice(1).join('/') : title
}

// A scene sketch is sized to its viewport; a component uses the default cell.
function cellSize(sketch: LoadedSketch) {
	const viewport = sketch.sketch.parameters?.viewport
	if (viewport) {
		const { width, height } = VIEWPORTS[viewport]
		return { w: width, h: height + LABEL_H }
	}
	return { w: CELL_W, h: CELL_H }
}

interface Placement {
	sketch: LoadedSketch
	x: number
	y: number
	w: number
	h: number
}

// Place a book's sketches: scenes (viewport sizes) flow in a single row at their own
// sizes; components pack into the uniform COLS grid.
function placeSketches(book: LoadedSketchbook): {
	cells: Placement[]
	frameW: number
	frameH: number
} {
	const isScene = Boolean(book.sketches[0]?.sketch.parameters?.viewport)
	const cells: Placement[] = []

	if (isScene) {
		let x = PAD
		let maxH = 0
		for (const sketch of book.sketches) {
			const { w, h } = cellSize(sketch)
			cells.push({ sketch, x, y: TITLE_H, w, h })
			x += w + GAP
			maxH = Math.max(maxH, h)
		}
		return { cells, frameW: x - GAP + PAD, frameH: TITLE_H + maxH + PAD }
	}

	book.sketches.forEach((sketch, i) => {
		const col = i % COLS
		const row = Math.floor(i / COLS)
		cells.push({
			sketch,
			x: PAD + col * (CELL_W + GAP),
			y: TITLE_H + row * (CELL_H + GAP),
			w: CELL_W,
			h: CELL_H,
		})
	})
	const cols = Math.min(book.sketches.length, COLS)
	const rows = Math.ceil(book.sketches.length / COLS)
	return {
		cells,
		frameW: cols * CELL_W + (cols - 1) * GAP + PAD * 2,
		frameH: TITLE_H + rows * CELL_H + (rows - 1) * GAP + PAD,
	}
}

// Lay sketchbooks out as named frames that shelf-pack left-to-right, wrapping past MAX_ROW.
function layoutGroup(editor: Editor, books: LoadedSketchbook[]) {
	let cursorX = PAD
	let cursorY = PAD + FRAME_LABEL_H
	let rowHeight = 0

	for (const book of books) {
		const { cells, frameW, frameH } = placeSketches(book)

		if (cursorX > PAD && cursorX + frameW > MAX_ROW) {
			cursorX = PAD
			// clear the next row's frame labels (which render above each frame)
			cursorY += rowHeight + GAP + FRAME_LABEL_H
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

		for (const cell of cells) {
			editor.createShape<SketchShape>({
				type: 'sketch',
				parentId: frameId,
				x: cell.x,
				y: cell.y,
				props: {
					w: cell.w,
					h: cell.h,
					sketchId: cell.sketch.id,
					args: { ...(cell.sketch.sketch.args ?? {}) },
				},
			})
		}

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
