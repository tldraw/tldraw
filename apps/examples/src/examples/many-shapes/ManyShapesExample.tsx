import {
	Editor,
	TLCreateShapePartial,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
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

// [2]
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

		// Mix shape types: mostly geo, some notes
		if (i % 7 === 0) {
			// Every 7th shape is a sticky note
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

	editor.run(() => {
		editor.createShapes(shapes)
	})
}

// [3]
function Controls() {
	const editor = useEditor()

	const handleGenerate = (count: number) => {
		generateShapes(editor, count)
		editor.zoomToFit({ animation: { duration: 300 } })
	}

	const handleClear = () => {
		editor.run(() => {
			const ids = [...editor.getCurrentPageShapeIds()]
			if (ids.length > 0) {
				editor.deleteShapes(ids)
			}
		})
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

export default function ManyShapesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Start with 500 shapes
					generateShapes(editor, 500)
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
				components={{ TopPanel: Controls }}
			/>
		</div>
	)
}

/*
[1]
Arrays of shape properties used to generate varied shapes. The mix of geo
types, fills, dashes, and colors creates a visually diverse canvas that
exercises many different rendering paths.

[2]
Shapes are laid out in a grid with slight random offsets for visual variety.
Every 7th shape is a sticky note, which has box shadow LOD behavior—zoom out
far enough and the shadows disappear. Geo shapes with "draw" dash style will
also simplify to solid strokes at low zoom levels, and "pattern" fills will
flatten to solid colors.

[3]
The control panel lets you add shapes in batches or clear the canvas. All
shape creation is wrapped in editor.run() so observers receive a single
batched update, which is one of the performance techniques described in the
performance docs.
*/
