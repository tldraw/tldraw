import { createShapeId, Tldraw, TLShapePartial } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ArrowStylingColorDashSizeFillExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return

					const arrows: TLShapePartial[] = []
					let y = 50

					// [1]
					const dashStyles = ['draw', 'solid', 'dashed', 'dotted'] as const
					dashStyles.forEach((dash, dashIndex) => {
						const x = 100
						arrows.push({
							id: createShapeId(),
							type: 'arrow',
							x: x + dashIndex * 300,
							y,
							props: {
								dash,
								color: 'black',
								size: 'm',
								fill: 'none',
								start: { x: 0, y: 0 },
								end: { x: 200, y: 0 },
							},
						})
					})

					y += 150

					// [2]
					const colors = ['red', 'blue', 'green', 'orange', 'violet', 'yellow'] as const
					colors.forEach((color, colorIndex) => {
						const x = 100
						arrows.push({
							id: createShapeId(),
							type: 'arrow',
							x: x + colorIndex * 200,
							y,
							props: {
								color,
								dash: 'solid',
								size: 'm',
								fill: 'solid',
								start: { x: 0, y: 0 },
								end: { x: 150, y: 0 },
							},
						})
					})

					y += 150

					// [3]
					const sizes = ['s', 'm', 'l', 'xl'] as const
					sizes.forEach((size, sizeIndex) => {
						const x = 100
						arrows.push({
							id: createShapeId(),
							type: 'arrow',
							x: x + sizeIndex * 300,
							y,
							props: {
								size,
								color: 'blue',
								dash: 'solid',
								fill: 'solid',
								start: { x: 0, y: 0 },
								end: { x: 200, y: 0 },
							},
						})
					})

					y += 150

					// [4]
					const fills = ['none', 'semi', 'solid', 'pattern'] as const
					fills.forEach((fill, fillIndex) => {
						const x = 100
						arrows.push({
							id: createShapeId(),
							type: 'arrow',
							x: x + fillIndex * 300,
							y,
							props: {
								fill,
								color: 'violet',
								dash: 'solid',
								size: 'xl',
								arrowheadEnd: 'diamond',
								start: { x: 0, y: 0 },
								end: { x: 200, y: 0 },
							},
						})
					})

					y += 150

					// [5]
					const scales = [0.5, 1, 1.5, 2] as const
					scales.forEach((scale, scaleIndex) => {
						const x = 100
						arrows.push({
							id: createShapeId(),
							type: 'arrow',
							x: x + scaleIndex * 300,
							y,
							props: {
								scale,
								color: 'green',
								dash: 'solid',
								size: 'm',
								fill: 'solid',
								start: { x: 0, y: 0 },
								end: { x: 200, y: 0 },
							},
						})
					})

					editor.createShapes(arrows)
					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
This example demonstrates the various styling options available for arrows in tldraw.

[1]
Dash styles: The first row shows all four dash patterns - 'draw' (hand-drawn, sketchy),
'solid' (continuous line), 'dashed' (evenly spaced dashes), and 'dotted' (evenly spaced dots).
The 'draw' style is particularly distinctive with its organic, hand-drawn appearance.

[2]
Colors: The second row demonstrates different color options available in tldraw's default palette.
Each arrow uses solid fill on the arrowhead to make the color more visible.

[3]
Sizes: The third row shows the four size options - 's' (small), 'm' (medium), 'l' (large),
and 'xl' (extra large). Size affects both stroke width and arrowhead dimensions proportionally.

[4]
Fill styles: The fourth row demonstrates different fill options for arrowheads - 'none' (no fill),
'semi' (semi-transparent), 'solid' (fully opaque), and 'pattern' (crosshatch pattern).

[5]
Scale: The fifth row shows different scale multipliers (0.5, 1, 1.5, 2). The scale property
affects the overall dimensions of the arrow including stroke width and arrowhead size.

*/
