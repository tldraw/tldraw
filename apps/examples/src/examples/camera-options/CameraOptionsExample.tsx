import { TLCameraOptions, TLGeoShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const CAMERA_OPTIONS: TLCameraOptions = {
	fit: 'cover',
	bounds: {
		x: 100,
		y: 100,
		w: 2400,
		h: 800,
	},
	origin: [0.5, 0.5],
	padding: [50, 50],
	panSpeed: 1,
	zoomSteps: [0.5, 0.75, 1, 1.5, 2],
	zoomMax: 2,
	zoomMin: 0.5,
	zoomSpeed: 1,
	isLocked: false,
	elastic: 0,
}

export default function CameraOptionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) {
						if (CAMERA_OPTIONS.fit === 'infinite') return

						const {
							bounds: { x, y, w, h },
						} = CAMERA_OPTIONS
						editor.createShape<TLGeoShape>({
							type: 'geo',
							x,
							y,
							props: { w, h },
						})
					}
				}}
				cameraOptions={CAMERA_OPTIONS}
			/>
		</div>
	)
}
