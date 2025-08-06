import { Box, SVGContainer, Tldraw, useEditor } from 'tldraw'

function ZoomToBoundsButton({ box, color }: { box: Box; color: string }) {
	const editor = useEditor()

	return (
		<button
			style={{
				padding: '8px 12px',
				border: '1px solid #ccc',
				color: 'white',
				cursor: 'pointer',
				pointerEvents: 'all',
				backgroundColor: color,
			}}
			onClick={() => editor.zoomToBounds(box, { inset: 32 })}
		>
			Zoom to {color} box
		</button>
	)
}

export default function ZoomToBoundsExample() {
	const zoomBox1 = new Box(50, 100, 900, 720)
	const zoomBox2 = new Box(1000, 500, 500, 400)

	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{
					TopPanel: () => (
						<>
							<ZoomToBoundsButton box={zoomBox1} color="purple" />
							<ZoomToBoundsButton box={zoomBox2} color="blue" />
						</>
					),
					OnTheCanvas: () => (
						<SVGContainer>
							<rect
								x={zoomBox1.x}
								y={zoomBox1.y}
								width={zoomBox1.w}
								height={zoomBox1.h}
								fill="none"
								stroke="purple"
							/>
							<rect
								x={zoomBox2.x}
								y={zoomBox2.y}
								width={zoomBox2.w}
								height={zoomBox2.h}
								fill="none"
								stroke="blue"
							/>
						</SVGContainer>
					),
				}}
			/>
		</div>
	)
}
