import { createShapeId, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function ArrowLabelsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					// [1]
					editor.createShapes([
						{
							id: createShapeId(),
							type: 'arrow',
							x: 100,
							y: 100,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Default label'),
								labelPosition: 0.5,
							},
						},
						// [2]
						{
							id: createShapeId(),
							type: 'arrow',
							x: 100,
							y: 200,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Start'),
								labelPosition: 0.2,
								color: 'blue',
								labelColor: 'red',
							},
						},
						{
							id: createShapeId(),
							type: 'arrow',
							x: 100,
							y: 300,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Middle'),
								labelPosition: 0.5,
								color: 'blue',
								labelColor: 'violet',
							},
						},
						{
							id: createShapeId(),
							type: 'arrow',
							x: 100,
							y: 400,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('End'),
								labelPosition: 0.8,
								color: 'blue',
								labelColor: 'green',
							},
						},
						// [3]
						{
							id: createShapeId(),
							type: 'arrow',
							x: 550,
							y: 100,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Draw font'),
								font: 'draw',
							},
						},
						{
							id: createShapeId(),
							type: 'arrow',
							x: 550,
							y: 200,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Sans font'),
								font: 'sans',
							},
						},
						{
							id: createShapeId(),
							type: 'arrow',
							x: 550,
							y: 300,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Serif font'),
								font: 'serif',
							},
						},
						{
							id: createShapeId(),
							type: 'arrow',
							x: 550,
							y: 400,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 300, y: 0 },
								richText: toRichText('Mono font'),
								font: 'mono',
							},
						},
						// [4]
						{
							id: createShapeId(),
							type: 'arrow',
							x: 300,
							y: 475,
							props: {
								start: { x: 0, y: 0 },
								end: { x: 400, y: 150 },
								bend: 50,
								richText: toRichText('Curved arrow'),
								labelPosition: 0.5,
								font: 'sans',
								color: 'violet',
								size: 'm',
							},
						},
					])

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
Introduction:

This example shows how to create arrows with text labels. Arrow labels are
set using the `richText` prop with the `toRichText()` helper, and can be
customized with position, color, and font options.

[1]
The simplest labeled arrow. Use `toRichText('your text')` to convert a plain string
into the rich text format that arrow labels expect. The `labelPosition` prop controls
where the label sits along the arrow, from 0 (start) to 1 (end). The `size` prop
('s', 'm', 'l', 'xl') controls both the arrow stroke width and the label font size.

[2]
Label position and color. The `labelPosition` prop places the label at different
points along the arrow path. The `labelColor` prop sets the text color independently
from the arrow's `color` prop, letting you use contrasting colors for readability.

[3]
Font styles. The `font` prop controls the label's typeface. Available options are
'draw' (hand-drawn), 'sans' (clean sans-serif), 'serif' (traditional), and
'mono' (monospace).

[4]
Labels on curved arrows. The `bend` prop creates a curved arrow, and the label
follows the curve.

*/
