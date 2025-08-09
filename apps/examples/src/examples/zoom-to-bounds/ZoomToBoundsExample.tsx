import { Box, createShapeId, Tldraw, useEditor } from 'tldraw'

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
			// Zoom to bounds!
			onClick={() => editor.zoomToBounds(box, { inset: 72 })}
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
				onMount={(editor) => {
					editor.createShapes([
						{
							id: createShapeId(),
							type: 'geo',
							x: zoomBox1.x,
							y: zoomBox1.y,
							isLocked: true,
							props: {
								w: zoomBox1.w,
								h: zoomBox1.h,
								color: 'violet',
							},
						},
						{
							id: createShapeId(),
							type: 'geo',
							x: zoomBox2.x,
							y: zoomBox2.y,
							isLocked: true,
							props: {
								w: zoomBox2.w,
								h: zoomBox2.h,
								color: 'blue',
							},
						},
					])
				}}
				components={{
					TopPanel: () => (
						<>
							<ZoomToBoundsButton box={zoomBox1} color="purple" />
							<ZoomToBoundsButton box={zoomBox2} color="blue" />
						</>
					),
				}}
			/>
		</div>
	)
}
