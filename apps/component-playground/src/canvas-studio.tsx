import { Editor, Tldraw, createShapeId } from 'tldraw'
import { PropertiesPanel } from './properties-panel'
import { sketchbooks } from './registry'
import { SketchShape, SketchShapeUtil } from './sketch-shape'

const CELL_W = 260
const CELL_H = 160
const GAP = 28
const PAD = 40
const TITLE_H = 44

// Lay each sketchbook out as a named frame (an artboard), with its sketches as
// instances in a row inside it. The canvas editor is the shared harness: every
// sketch renders inside its theme + i18n + editor context.
function layoutSketches(editor: Editor) {
	// Guard against a second run (StrictMode remount / HMR).
	if (editor.getCurrentPageShapeIds().size > 0) return

	let y = PAD
	for (const book of sketchbooks) {
		const n = book.sketches.length
		const frameW = n * CELL_W + (n - 1) * GAP + PAD * 2
		const frameH = TITLE_H + CELL_H + PAD
		const frameId = createShapeId()

		editor.createShape({
			id: frameId,
			type: 'frame',
			x: PAD,
			y,
			props: { w: frameW, h: frameH, name: book.title },
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

	editor.selectNone()
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
