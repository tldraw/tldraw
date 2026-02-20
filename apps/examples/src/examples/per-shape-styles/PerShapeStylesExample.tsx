import { TLShapeStylesConfig, Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const shapeStyles: TLShapeStylesConfig = {
	shapes: {
		geo: {
			sizes: {
				s: { stroke: 1, labelFont: 14 },
				m: { stroke: 3, labelFont: 18 },
				l: { stroke: 6, labelFont: 24 },
				xl: { stroke: 12, labelFont: 32 },
			},
		},
	},
}

export default function PerShapeStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeStyles={shapeStyles}
				onMount={(editor) => {
					// [2]
					const sizes = ['s', 'm', 'l', 'xl'] as const

					sizes.forEach((size, i) => {
						// Geo shape — uses the per-shape overridden sizes
						editor.createShape({
							id: createShapeId(),
							type: 'geo',
							x: 100,
							y: 100 + i * 160,
							props: {
								w: 200,
								h: 120,
								size,
								color: 'blue',
								richText: toRichText(`geo ${size}`),
							},
						})

						// Text shape — uses the default global sizes (unaffected)
						editor.createShape({
							id: createShapeId(),
							type: 'text',
							x: 380,
							y: 140 + i * 160,
							props: {
								size,
								color: 'red',
								richText: toRichText(`text ${size}`),
							},
						})
					})

					editor.zoomToFit({ animation: { duration: 0 } })
				}}
			/>
		</div>
	)
}

/*
[1]
Use the `shapeStyles` prop with a `shapes` key to override style tokens for
specific shape types. Here we make geo shapes use different stroke widths and
label font sizes than the global defaults. Other shape types (draw, arrow,
text, etc.) are unaffected.

[2]
Create geo shapes and text shapes at each size to compare. The geo shapes
use the per-shape overridden sizes, while the text shapes use the default
global sizes — demonstrating that the override only affects geo shapes.
*/
