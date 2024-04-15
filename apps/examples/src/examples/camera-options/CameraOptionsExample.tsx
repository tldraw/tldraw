import { TLCameraOptions, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const CAMERA_OPTIONS: TLCameraOptions = {
	constraints: {
		fit: 'max',
		bounds: {
			x: 0,
			y: 0,
			w: 1200,
			h: 800,
		},
		padding: { x: 10, y: 200 },
		origin: { x: 0.5, y: 0.5 },
	},
	panSpeed: 1,
	zoomSteps: [0.1, 0.5, 0.75, 1, 1.5, 2, 8],
	zoomMax: 8,
	zoomMin: 0.1,
	zoomSpeed: 1,
	isLocked: false,
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
						if (!CAMERA_OPTIONS.constraints) return null

						const {
							constraints: {
								bounds: { x, y, w, h },
							},
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
										// grey and white stripes
										border: '1px dashed var(--color-text)',
										backgroundImage: `
											linear-gradient(45deg, #AAAAAA22 25%, transparent 25%),
											linear-gradient(-45deg, #AAAAAA22 25%, transparent 25%),
											linear-gradient(45deg, transparent 75%, #AAAAAA22 75%),
											linear-gradient(-45deg, transparent 75%, #AAAAAA22 75%)`,
										backgroundSize: '200px 200px',
										backgroundPosition: '0 0, 0 100px, 100px -100px, -100px 0px',
									}}
								/>
							</>
						)
					},
					InFrontOfTheCanvas: () => {
						// This component shows the padding (in screen space)
						if (!CAMERA_OPTIONS.constraints) return null

						const {
							constraints: {
								padding: { x: px, y: py },
							},
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
										border: '1px dotted var(--color-text)',
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
