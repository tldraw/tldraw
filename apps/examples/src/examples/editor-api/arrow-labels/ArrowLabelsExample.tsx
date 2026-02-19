import { createShapeId, Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function ArrowLabelsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					const boxA = createShapeId()
					const boxB = createShapeId()
					const boxC = createShapeId()

					editor.createShapes([
						{ id: boxA, type: 'geo', x: 100, y: 100 },
						{ id: boxB, type: 'geo', x: 450, y: 100 },
						{ id: boxC, type: 'geo', x: 450, y: 350 },
					])

					// [1]
					editor.createShape({
						type: 'arrow',
						x: 200,
						y: 150,
						props: {
							richText: toRichText('Default label'),
							start: { x: 0, y: 0 },
							end: { x: 250, y: 0 },
						},
					})

					// [2]
					editor.createShape({
						type: 'arrow',
						x: 200,
						y: 250,
						props: {
							richText: toRichText('Near start'),
							labelPosition: 0.2,
							start: { x: 0, y: 0 },
							end: { x: 250, y: 0 },
						},
					})

					editor.createShape({
						type: 'arrow',
						x: 200,
						y: 310,
						props: {
							richText: toRichText('Near end'),
							labelPosition: 0.8,
							start: { x: 0, y: 0 },
							end: { x: 250, y: 0 },
						},
					})

					// [3]
					editor.createShape({
						type: 'arrow',
						x: 200,
						y: 370,
						props: {
							richText: toRichText('Red label'),
							labelColor: 'red',
							color: 'blue',
							start: { x: 0, y: 0 },
							end: { x: 250, y: 0 },
						},
					})

					// [4]
					editor.createShape({
						type: 'arrow',
						x: 200,
						y: 430,
						props: {
							richText: toRichText('Draw font'),
							font: 'draw',
							start: { x: 0, y: 0 },
							end: { x: 250, y: 0 },
						},
					})

					editor.createShape({
						type: 'arrow',
						x: 200,
						y: 490,
						props: {
							richText: toRichText('Mono font'),
							font: 'mono',
							start: { x: 0, y: 0 },
							end: { x: 250, y: 0 },
						},
					})

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
Create an arrow with a text label using `richText` and the `toRichText()` helper. By default the
label is positioned at the midpoint of the arrow (`labelPosition: 0.5`).

[2]
Use `labelPosition` to control where the label sits along the arrow. A value of 0 places it at
the start, 0.5 at the middle, and 1 at the end. Fractional values like 0.2 or 0.8 let you fine-tune
placement.

[3]
Set `labelColor` to change the label's text color independently from the arrow's `color`. This is
useful when you want the label to stand out against the arrow or background.

[4]
The `font` prop controls the label's typeface. Options include `'draw'`, `'sans'`, `'serif'`, and
`'mono'`. This matches the font options available for other text-bearing shapes in tldraw.
*/
