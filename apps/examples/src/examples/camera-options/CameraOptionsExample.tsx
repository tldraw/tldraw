import { TLCameraOptions, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const CAMERA_OPTIONS: TLCameraOptions = {
	fit: 'contain',
	bounds: {
		x: 0,
		y: 0,
		w: 1200,
		h: 800,
	},
	origin: [0.5, 0.5],
	padding: [200, 50],
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
				persistenceKey="camera-options"
				cameraOptions={CAMERA_OPTIONS}
				components={{
					// These components are just included for debugging / visualization!
					OnTheCanvas: () => {
						// This component shows the bounds (in page space)
						if (CAMERA_OPTIONS.fit === 'infinite') return null

						const {
							bounds: { x, y, w, h },
						} = CAMERA_OPTIONS

						return (
							<>
								<div
									style={{
										position: 'absolute',
										top: y,
										left: x,
										width: w,
										height: h,
										background: 'white',
										border: '1px dashed black',
									}}
								/>
							</>
						)
					},
					InFrontOfTheCanvas: () => {
						// This component shows the padding (in screen space)
						if (CAMERA_OPTIONS.fit === 'infinite') return null

						const {
							padding: [py, px],
						} = CAMERA_OPTIONS

						if (!px && !py) return null

						return (
							<>
								<div
									style={{
										position: 'absolute',
										top: py,
										left: px,
										width: `calc(100% - ${px * 2}px)`,
										height: `calc(100% - ${py * 2}px)`,
										border: '1px dotted black',
									}}
								/>
							</>
						)
					},
				}}
			/>
		</div>
	)
}
