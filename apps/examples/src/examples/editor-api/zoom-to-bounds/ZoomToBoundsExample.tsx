import { TlButton } from '@tldraw/ui'
import { Box, createShapeId, Tldraw, useEditor } from 'tldraw'
import { ExampleTlUiProvider } from '../../../misc/ExampleTlUiProvider'
import './zoom-to-bounds.css'

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
					TopPanel: () => {
						const editor = useEditor()
						return (
							<ExampleTlUiProvider>
								<div className="tl-menu control-panel">
									<TlButton
										type="normal"
										// Zoom to bounds!
										onClick={() => editor.zoomToBounds(zoomBox1, { inset: 72 })}
									>
										Zoom to violet box
									</TlButton>
									<TlButton
										type="normal"
										// Zoom to bounds!
										onClick={() =>
											editor.zoomToBounds(zoomBox2, { inset: 72, animation: { duration: 200 } })
										}
									>
										Zoom to blue box
									</TlButton>
									<TlButton
										type="normal"
										// Zoom to bounds!
										onClick={() =>
											editor.zoomToBounds(Box.Common([zoomBox1, zoomBox2]), {
												inset: 200,
												animation: { duration: 200 },
											})
										}
									>
										Zoom to both boxes
									</TlButton>
								</div>
							</ExampleTlUiProvider>
						)
					},
				}}
			/>
		</div>
	)
}
