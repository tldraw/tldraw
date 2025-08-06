import { useState } from 'react'
import { Box, createShapeId, Tldraw, toRichText, useEditor, Vec } from 'tldraw'
import './zoom-to-bounds.css'

// There is a guide at the bottom of this file :)

function CameraButtons({
	box1,
	box2,
	initialCameraLockedState,
}: {
	box1: Box
	box2: Box
	initialCameraLockedState: boolean
}) {
	const editor = useEditor()
	const [isCameraLocked, setIsCameraLocked] = useState(initialCameraLockedState)

	const toggleCameraLock = () => {
		const newLockedState = !isCameraLocked
		setIsCameraLocked(newLockedState)
		editor.setCameraOptions({ isLocked: newLockedState })
	}

	// [1]
	const customZoomToBounds = (
		box: Box,
		forceZoomEvenIfLocked: boolean = false,
		animationDuration: number
	) => {
		editor.zoomToBounds(box, {
			force: forceZoomEvenIfLocked,
			inset: 32,
			animation: { duration: animationDuration },
		})
	}

	// [2]
	return (
		<div className="camera-controls">
			{/* [a] */}
			<button
				onClick={toggleCameraLock}
				className={`camera-button camera-button--lock ${isCameraLocked ? 'locked' : ''}`}
			>
				{isCameraLocked ? '🔒 Unlock Camera' : '🔓 Lock Camera'}
			</button>

			{/* [b] */}
			<button
				onClick={() => customZoomToBounds(box1, false, 750)}
				disabled={isCameraLocked}
				className="camera-button camera-button--zoom"
			>
				Zoom to Box 1
			</button>

			{/* [c] */}
			<button
				onClick={() => customZoomToBounds(box2, true, 100)}
				className="camera-button camera-button--zoom"
			>
				Zoom to Box 2 (Forced)
			</button>
		</div>
	)
}

export default function ZoomToBoundsExample() {
	const position1 = new Vec(1000, 500)
	const size1 = new Vec(500, 400)

	const position2 = new Vec(50, 100)
	const size2 = new Vec(900, 720)

	const zoomBox1 = new Box(position1.x, position1.y, size1.x, size1.y)
	const zoomBox2 = new Box(position2.x, position2.y, size2.x, size2.y)

	const initialCameraLockedState = true

	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.setCameraOptions({ isLocked: initialCameraLockedState })

					const shapeAId = createShapeId()
					const shapeBId = createShapeId()
					editor.createShapes([
						{
							id: shapeAId,
							type: 'geo',
							x: position1.x,
							y: position1.y,
							props: {
								w: size1.x,
								h: size1.y,
								richText: toRichText('box 1'),
							},
						},
						{
							id: shapeBId,
							type: 'geo',
							x: position2.x,
							y: position2.y,
							props: {
								w: size2.x,
								h: size2.y,
								richText: toRichText('box 2'),
							},
						},
					])
				}}
				components={{
					TopPanel: () => (
						<CameraButtons
							box1={zoomBox1}
							box2={zoomBox2}
							initialCameraLockedState={initialCameraLockedState}
						/>
					),
				}}
			/>
		</div>
	)
}

/*
This example shows how to use the editor's `zoomToBounds` method to programmatically set the zoom of the camera to specific boxes on the canvas.

[1]
This function calls the `editor.zoomToBounds` function with some custom options.
- `force` - If true, the camera will zoom to the bounds even if the camera is locked.
- `inset` - The amount of inset padding to add to the bounds.
- `animation` - Animation settings, where we set the duration of the animation.
This is called below by the two "Zoom to Box" buttons.

[2]
The 3 camera control buttons:

- [a] Lets you lock/unlock the camera.

- [b] Zooms to box 1's bounds.

- [c] Zooms to box 2's bounds. This button will zoom to the bounds even if the camera is locked.
*/
