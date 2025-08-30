import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function CustomColorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapes().length > 0) return

					const rows = 20
					const cols = 20
					const spacing = 32
					const startX = 100
					const startY = 100

					for (let row = 0; row < rows; row++) {
						for (let col = 0; col < cols; col++) {
							const x = startX + col * spacing
							const y = startY + row * spacing
							const idx = row * cols + col
							const hue = (idx / (rows * cols)) * 360
							editor.createShape({
								type: 'geo',
								x,
								y,
								props: {
									geo: 'ellipse',
									w: 24,
									h: 24,
									color: `hsl(${hue}, 100%, 50%)`, // [1]
									fill: 'pattern',
								},
							})
						}
					}
				}}
			/>
		</div>
	)
}

/*

[1]
In addition to taking named colors from the default color theme (which have different variants for strokes, 
fills, patterns, etc), you can also set the color to an arbitrary CSS color. Here we're setting the color 
to a HSL color. This single hex is used for all of the color variants (stroke, fill, pattern, etc).

See Custom Colors 2 for an example of how to customize the theme to include new colors with their variants.

See Changing Default Colors for an example of how to change the default color theme.
*/
