import { Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ArrowBindingOptionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					const spacing = 300

					// [1]
					const shape1Id = createShapeId()
					editor.createShape({
						id: shape1Id,
						type: 'geo',
						x: 100,
						y: 100,
						props: {
							w: 150,
							h: 150,
							richText: toRichText('isPrecise: false\n(always center)'),
							color: 'blue',
						},
					})

					// [2]
					const arrow1Id = createShapeId()
					editor.createShape({
						id: arrow1Id,
						type: 'arrow',
						props: {
							start: { x: 50, y: 175 },
							end: { x: 100, y: 175 },
						},
					})
					editor.createBindings([
						{
							fromId: arrow1Id,
							toId: shape1Id,
							type: 'arrow',
							props: {
								terminal: 'end',
								normalizedAnchor: { x: 0.25, y: 0.5 },
								isPrecise: false,
								isExact: false,
							},
						},
					])

					// [3]
					const shape2Id = createShapeId()
					editor.createShape({
						id: shape2Id,
						type: 'geo',
						x: 100 + spacing,
						y: 100,
						props: {
							w: 150,
							h: 150,
							richText: toRichText('isPrecise: true\n(custom anchor)'),
							color: 'green',
						},
					})

					// [4]
					const arrow2Id = createShapeId()
					editor.createShape({
						id: arrow2Id,
						type: 'arrow',
						props: {
							start: { x: 50 + spacing, y: 175 },
							end: { x: 100 + spacing, y: 175 },
						},
					})
					editor.createBindings([
						{
							fromId: arrow2Id,
							toId: shape2Id,
							type: 'arrow',
							props: {
								terminal: 'end',
								normalizedAnchor: { x: 0.25, y: 0.5 },
								isPrecise: true,
								isExact: false,
							},
						},
					])

					// [5]
					const shape3Id = createShapeId()
					editor.createShape({
						id: shape3Id,
						type: 'geo',
						x: 100,
						y: 100 + spacing,
						props: {
							w: 150,
							h: 150,
							richText: toRichText('isExact: true\n(passes through)'),
							color: 'orange',
						},
					})

					// [6]
					const arrow3Id = createShapeId()
					editor.createShape({
						id: arrow3Id,
						type: 'arrow',
						props: {
							start: { x: 50, y: 175 + spacing },
							end: { x: 100, y: 175 + spacing },
						},
					})
					editor.createBindings([
						{
							fromId: arrow3Id,
							toId: shape3Id,
							type: 'arrow',
							props: {
								terminal: 'end',
								normalizedAnchor: { x: 0.5, y: 0.5 },
								isPrecise: true,
								isExact: true,
							},
						},
					])

					// [7]
					const shape4Id = createShapeId()
					editor.createShape({
						id: shape4Id,
						type: 'geo',
						x: 100 + spacing,
						y: 100 + spacing,
						props: {
							w: 150,
							h: 150,
							richText: toRichText('Combined\n(precise + exact)'),
							color: 'red',
						},
					})

					const arrow4Id = createShapeId()
					editor.createShape({
						id: arrow4Id,
						type: 'arrow',
						props: {
							start: { x: 50 + spacing, y: 175 + spacing },
							end: { x: 100 + spacing, y: 175 + spacing },
						},
					})
					editor.createBindings([
						{
							fromId: arrow4Id,
							toId: shape4Id,
							type: 'arrow',
							props: {
								terminal: 'end',
								normalizedAnchor: { x: 0.75, y: 0.75 },
								isPrecise: true,
								isExact: true,
							},
						},
					])

					editor.zoomToFit()
				}}
			/>
		</div>
	)
}

/*
[1]
Create the first shape demonstrating isPrecise: false. When isPrecise is false, the arrow
always targets the center of the shape, regardless of the normalizedAnchor value provided.

[2]
Create an arrow with isPrecise: false. Even though we specify normalizedAnchor at (0.25, 0.5)
(left side of the shape), the arrow will point to the center because isPrecise is false.
The arrow stops at the shape's edge.

[3]
Create the second shape demonstrating isPrecise: true. When isPrecise is true, the arrow
respects the normalizedAnchor and targets the specified position within the shape.

[4]
Create an arrow with isPrecise: true and the same normalizedAnchor at (0.25, 0.5). This time,
the arrow will actually target the left side of the shape as specified by the anchor. The arrow
still stops at the shape's edge (isExact: false).

[5]
Create the third shape demonstrating isExact: true. When isExact is true, the arrow passes
through the shape to reach its exact target point instead of stopping at the edge.

[6]
Create an arrow with both isPrecise: true and isExact: true. The normalizedAnchor at (0.5, 0.5)
targets the center of the shape, and isExact: true makes the arrow pass through the shape to
reach that exact point. This is useful for diagrams where arrows need to cross through shapes.

[7]
Create the fourth shape demonstrating the combination of precise and exact targeting. The arrow
targets the bottom-right quadrant (0.75, 0.75) and passes through the shape to that exact point.
This shows fine-grained control over arrow positioning.

Key takeaways:
- isPrecise: false = arrow always points to center (default safe behavior)
- isPrecise: true = arrow respects normalizedAnchor position
- isExact: false = arrow stops at shape edge (default)
- isExact: true = arrow passes through to exact target point
*/
