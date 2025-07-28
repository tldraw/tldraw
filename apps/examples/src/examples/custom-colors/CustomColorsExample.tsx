import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

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
									color: `hsl(${hue}, 100%, 50%)`,
								},
							})
						}
					}
				}}
			/>
		</div>
	)
}
