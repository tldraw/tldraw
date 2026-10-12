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

					// [2]
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

					// [3]
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

					// [4]
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
Each pair below creates a geo shape and an arrow, then binds the arrow's end terminal to the
shape with `editor.createBindings`. The arrow's `end` prop is only a fallback position; once
the binding exists, the arrow's endpoint is computed from the binding props.

[1]
`isPrecise: false`. The `normalizedAnchor` of (0.25, 0.5) is ignored and the arrow aims at
the shape's center, stopping at the edge. This is what you get when a user drags an arrow
onto a shape without pausing to pick a specific point.

[2]
`isPrecise: true` with the same anchor. Now the arrow aims at the anchor position (a quarter
of the way across, vertically centered), still stopping at the shape's edge because
`isExact` is false.

[3]
`isExact: true`. Instead of stopping at the edge, the arrow continues into the shape until it
reaches the anchor point itself, here the exact center.

[4]
Both flags together with an off-center anchor at (0.75, 0.75): the arrow enters the shape and
ends at that exact point.
*/
