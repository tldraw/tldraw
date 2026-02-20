import { TLStylesConfig, Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const styles: TLStylesConfig = {
	// Global defaults for all shapes.
	sizes: {
		s: { stroke: 1, font: 14, labelFont: 14, arrowLabelFont: 14 },
		m: { stroke: 2, font: 16, labelFont: 16, arrowLabelFont: 16 },
		l: { stroke: 4, font: 20, labelFont: 20, arrowLabelFont: 20 },
		xl: { stroke: 8, font: 24, labelFont: 24, arrowLabelFont: 24 },
	},
	// Shape-specific overrides now live under `styles.shapes`.
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
				styles={styles}
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
Set global token defaults at the top level (`sizes`) and put shape-specific
overrides under `styles.shapes`. Here, geo shapes override their size tokens,
while text shapes still use the global values.

[2]
Create geo shapes and text shapes at each size to compare. The geo shapes
use the per-shape overridden sizes, while the text shapes use the default
global sizes — demonstrating that the override only affects geo shapes.
*/
