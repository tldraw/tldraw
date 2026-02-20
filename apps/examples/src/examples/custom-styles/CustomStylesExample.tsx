import { useEffect } from 'react'
import { TLStylesConfig, Tldraw, createShapeId, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
declare module '@tldraw/tlschema' {
	interface TLColorStyleExtensions {
		coral: true
		forest: true
	}
}

// [2]
const styles: TLStylesConfig = {
	colors: {
		coral: {
			light: {
				solid: '#ff6b6b',
				fill: '#ff6b6b',
				semi: '#ffe0e0',
				pattern: '#ff8787',
			},
			dark: {
				solid: '#ff8787',
				fill: '#ff8787',
				semi: '#4a2020',
				pattern: '#ff6b6b',
			},
		},
		forest: {
			light: {
				solid: '#2d6a4f',
				fill: '#2d6a4f',
				semi: '#d8f3dc',
				pattern: '#40916c',
			},
			dark: {
				solid: '#52b788',
				fill: '#52b788',
				semi: '#1b3a2d',
				pattern: '#40916c',
			},
		},
	},
	// [3]
	sizes: {
		s: { stroke: 1, font: 12, labelFont: 12, arrowLabelFont: 12 },
		m: { stroke: 2, font: 16, labelFont: 16, arrowLabelFont: 16 },
		l: { stroke: 4, font: 20, labelFont: 20, arrowLabelFont: 20 },
		xl: { stroke: 8, font: 24, labelFont: 24, arrowLabelFont: 24 },
	},
	// [4]
	fonts: {
		sans: "'Inter', sans-serif",
		mono: "'JetBrains Mono', monospace",
	},
	// [9]
	shapes: {
		geo: {
			colors: {
				coral: {
					light: {
						solid: '#9b2c2c',
						fill: '#9b2c2c',
					},
					dark: {
						solid: '#fca5a5',
						fill: '#fca5a5',
					},
				},
			},
			sizes: {
				m: { stroke: 5, labelFont: 20 },
			},
		},
	},
}

// [5]
function useGoogleFonts() {
	useEffect(() => {
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href =
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap'
		document.head.appendChild(link)
		return () => {
			document.head.removeChild(link)
		}
	}, [])
}

export default function CustomStylesExample() {
	useGoogleFonts()

	return (
		<div className="tldraw__editor">
			<Tldraw
				styles={styles}
				onMount={(editor) => {
					// [6]
					const customColors = ['coral', 'forest'] as const
					const fills = ['none', 'semi', 'solid'] as const

					customColors.forEach((color, ci) => {
						fills.forEach((fill, fi) => {
							editor.createShape({
								id: createShapeId(),
								type: 'geo',
								x: 100 + fi * 200,
								y: 100 + ci * 160,
								props: {
									w: 160,
									h: 120,
									color,
									fill,
									richText: toRichText(`${color} ${fill}`),
									size: 'm',
								},
							})
						})
					})

					// [7]
					const sizes = ['s', 'm', 'l', 'xl'] as const
					sizes.forEach((size, i) => {
						editor.createShape({
							id: createShapeId(),
							type: 'geo',
							x: 700,
							y: 100 + i * 140,
							props: {
								w: 160,
								h: 100,
								size,
								color: 'blue',
								richText: toRichText(size.toUpperCase()),
							},
						})
					})

					// [8]
					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 440,
						props: {
							richText: toRichText('Inter (sans)'),
							font: 'sans',
							size: 'l',
						},
					})

					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 500,
						props: {
							richText: toRichText('JetBrains Mono'),
							font: 'mono',
							size: 'l',
						},
					})

					editor.createShape({
						id: createShapeId(),
						type: 'text',
						x: 100,
						y: 570,
						props: {
							richText: toRichText('Global coral text token'),
							color: 'coral',
							size: 'm',
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
Use module augmentation on `TLColorStyleExtensions` to register custom color
names with the type system. This makes TypeScript accept them wherever a
`TLDefaultColorStyle` is expected (e.g. in `createShape` props).

[2]
Add new colors by defining them in the `colors` map. Each color needs `light`
and `dark` variants. The key color properties are:
- `solid`: Used for strokes and solid fills
- `fill`: Used for the main shape fill (usually same as `solid`)
- `semi`: Used for semi-transparent/light fills
- `pattern`: Used for pattern fills

[3]
Override size tokens. Each size token defines pixel values for stroke width,
text font size, label font size, and arrow label font size.

[4]
Override the CSS font-family for specific font tokens. Here we swap the
`sans` and `mono` fonts to use Google Fonts typefaces.

[5]
Load the Google Fonts that our custom font tokens reference. The fonts must
be loaded before they can render — here we inject a <link> stylesheet tag.

[6]
Create geo shapes with custom colors in each fill mode (none, semi, solid)
so the color variants are clearly visible.

[7]
Create geo shapes at each size to show the different stroke widths and label
font sizes produced by our custom size tokens.

[8]
Create text shapes using the overridden `sans` and `mono` font families.

[9]
Use `styles.shapes` for shape-specific overrides. Here we override the `coral`
color and `m` size token only for `geo` shapes. Text shapes still use the
global token values.
*/
