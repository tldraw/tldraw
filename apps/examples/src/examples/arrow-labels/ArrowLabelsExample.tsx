import { createShapeId, Editor, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function ArrowLabelsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Only do this on an empty canvas
					if (editor.getCurrentPageShapeIds().size > 0) return

					createArrowsWithLabels(editor)
				}}
			/>
		</div>
	)
}

function createArrowsWithLabels(editor: Editor) {
	const boxAId = createShapeId()
	const boxBId = createShapeId()
	const boxCId = createShapeId()

	// Create three shapes to connect with arrows
	editor.createShapes([
		{
			id: boxAId,
			type: 'geo',
			x: 100,
			y: 100,
			props: {
				w: 100,
				h: 100,
				geo: 'rectangle',
			},
		},
		{
			id: boxBId,
			type: 'geo',
			x: 300,
			y: 100,
			props: {
				w: 100,
				h: 100,
				geo: 'rectangle',
			},
		},
		{
			id: boxCId,
			type: 'geo',
			x: 200,
			y: 300,
			props: {
				w: 100,
				h: 100,
				geo: 'rectangle',
			},
		},
	])

	// [1] Arrow with label at the start (labelPosition: 0)
	editor.createShape({
		type: 'arrow',
		x: 150,
		y: 150,
		props: {
			start: { x: 0, y: 0 },
			end: { x: 150, y: 0 },
			// [2]
			richText: toRichText('Start'),
			labelPosition: 0, // 0 = start of arrow
			labelColor: 'blue',
			font: 'sans',
		},
	})

	// [1] Arrow with label at the middle (labelPosition: 0.5)
	editor.createShape({
		type: 'arrow',
		x: 350,
		y: 150,
		props: {
			start: { x: 0, y: 0 },
			end: { x: -50, y: 150 },
			// [2]
			richText: toRichText('Middle'),
			labelPosition: 0.5, // 0.5 = middle of arrow (default)
			labelColor: 'red',
			font: 'serif',
		},
	})

	// [1] Arrow with label at the end (labelPosition: 1)
	editor.createShape({
		type: 'arrow',
		x: 200,
		y: 350,
		props: {
			start: { x: 0, y: 0 },
			end: { x: 100, y: -50 },
			// [2]
			richText: toRichText('End'),
			labelPosition: 1, // 1 = end of arrow
			labelColor: 'green',
			font: 'mono',
		},
	})

	// [3] Arrow with custom label color and font
	editor.createShape({
		type: 'arrow',
		x: 150,
		y: 200,
		props: {
			start: { x: 0, y: 0 },
			end: { x: 0, y: 100 },
			richText: toRichText('Custom Style'),
			labelPosition: 0.5,
			labelColor: 'violet',
			font: 'draw',
		},
	})
}

/*
Introduction:

This example shows how to create arrows with text labels and customize their appearance.

[1]
The labelPosition property controls where the label appears along the arrow:
- 0 = start of the arrow
- 0.5 = middle of the arrow (default)
- 1 = end of the arrow

You can use any value between 0 and 1 to position the label anywhere along the arrow's path.

[2]
The richText property contains the label's text content. Use the toRichText() helper function
from '@tldraw/editor' to convert a string into the TLRichText format required by the arrow shape.

[3]
You can customize the label's appearance using:
- labelColor: Any TLDefaultColorStyle ('black', 'blue', 'green', 'red', 'violet', etc.)
- font: Any TLDefaultFontStyle ('sans', 'serif', 'mono', 'draw')

These properties allow you to match your arrow labels to your design system or use them
to create visual hierarchy in diagrams, flowcharts, and architecture diagrams.
*/
