import { Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function EasterEggStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.createShapes([
						// [1]
						{
							type: 'geo',
							x: 0,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								fill: 'fill',
								richText: toRichText('Fill\n(Alt+F)'),
							},
						},
						{
							type: 'geo',
							x: 300,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								fill: 'lined-fill',
								richText: toRichText('Lined fill\n(Alt+Shift+F)'),
							},
						},
						// [2]
						{
							type: 'geo',
							x: 600,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'white',
								fill: 'fill',
								richText: toRichText('White\n(Alt+T)'),
							},
						},
						// [3]
						{
							type: 'geo',
							x: 900,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								richText: toRichText('Label color'),
								labelColor: 'red',
							},
						},
						// [4]
						{
							type: 'geo',
							x: 1200,
							y: 0,
							props: {
								geo: 'rectangle',
								w: 250,
								h: 250,
								color: 'blue',
								scale: 2.5,
								richText: toRichText('Scale'),
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
Some style values are valid on shapes but are hidden or hard to find in the default style panel.
They can still be set programmatically or, for some, with a keyboard shortcut.

[1]
`fill: 'fill'` (Alt+F) is a solid fill in the shape's full color rather than the tinted 'solid'
fill; `fill: 'lined-fill'` (Alt+Shift+F) is a slightly lighter solid variant. Both are tucked
away in the fill picker's overflow dropdown.

[2]
`color: 'white'` (Alt+T) is a white color option not shown in the color picker.

[3]
`labelColor` sets the label text color independently of the shape's `color`. The default style
panel has no picker for it, so it can only be set programmatically.

[4]
`scale` multiplies the shape's stroke width and text size without changing `w`/`h`. The "Dynamic
size" preference sets it automatically based on zoom when creating shapes; here it's set directly.
*/
