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
Arrow labels are stored in the arrow's `richText` prop. Use the `toRichText()` helper to
turn a plain string into that format.

[1]
The simplest labeled arrow. `labelPosition` is a fraction along the arrow from 0 (start) to
1 (end); 0.5 is the default and centers the label.

[2]
`labelColor` sets the text color independently of the arrow's `color`, which is useful for
contrast when the arrow itself is a light color.

[3]
`font` picks the label typeface: 'draw' (hand-drawn), 'sans', 'serif', or 'mono'. The `size`
prop, shared with the stroke width, controls the label's font size.

[4]
`bend` curves the arrow, and the label is positioned along the curve rather than the chord.
*/
