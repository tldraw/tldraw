import {
	Editor,
	TLComponents,
	TLCreateShapePartial,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

const GEO_TYPES = [
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'pentagon',
	'hexagon',
	'octagon',
	'star',
	'cloud',
	'heart',
] as const

const COLORS = [
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
] as const

const FILLS = ['none', 'semi', 'solid', 'pattern'] as const
const DASHES = ['draw', 'solid', 'dashed', 'dotted'] as const
const SIZES = ['s', 'm', 'l'] as const

function pick<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

// [1]
function generateShapes(editor: Editor, count: number) {
	const cols = Math.ceil(Math.sqrt(count * 1.5))
	const cellW = 200
	const cellH = 200
	const padding = 20

	const shapes: TLCreateShapePartial[] = []
	for (let i = 0; i < count; i++) {
		const col = i % cols
		const row = Math.floor(i / cols)
		const x = col * cellW + padding
		const y = row * cellH + padding
		const w = cellW - padding * 2
		const h = cellH - padding * 2

		if (i % 7 === 0) {
			shapes.push({
				id: createShapeId(),
				type: 'note' as const,
				x: x + Math.random() * 20,
				y: y + Math.random() * 20,
				props: {
					color: pick(COLORS),
					size: pick(SIZES),
				},
			})
		} else {
			shapes.push({
				id: createShapeId(),
				type: 'geo' as const,
				x: x + Math.random() * 20,
				y: y + Math.random() * 20,
				props: {
					geo: pick(GEO_TYPES),
					w: w * (0.6 + Math.random() * 0.4),
					h: h * (0.6 + Math.random() * 0.4),
					color: pick(COLORS),
					fill: pick(FILLS),
					dash: pick(DASHES),
					size: pick(SIZES),
				},
			})
		}
	}

	// [2]
	editor.createShapes(shapes)
}

function Controls() {
	const editor = useEditor()

	const handleGenerate = (count: number) => {
		generateShapes(editor, count)
		editor.zoomToFit({ animation: { duration: 300 } })
	}

	const handleClear = () => {
		editor.deleteShapes([...editor.getCurrentPageShapeIds()])
	}

	return (
		<div style={{ display: 'flex', gap: 4, padding: 8, flexWrap: 'wrap' }}>
			<TldrawUiButton type="normal" onClick={() => handleGenerate(200)}>
				Add 200 shapes
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => handleGenerate(500)}>
				Add 500 shapes
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => handleGenerate(1000)}>
				Add 1000 shapes
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={handleClear}>
				Clear all
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = { TopPanel: Controls }

export default function ManyShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					generateShapes(editor, 500)
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
				components={components}
			/>
		</div>
	)
}

/*
[1]
Shapes are laid out in a grid with slight random offsets. Every 7th shape is a sticky note,
whose shadow is dropped at low zoom; the rest are geo shapes with random fills, dashes, and
sizes so that "draw" strokes and "pattern" fills get exercised too, since both simplify when
zoomed out.

[2]
One `createShapes` call with the whole array is a single store transaction, so observers get
one batched update instead of one per shape. Wrapping many separate editor calls in
`editor.run` achieves the same thing.
*/
