import { TLCameraOptions, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './ScrollbarExample.css'

const CAMERA_OPTIONS: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'none',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [1],
}

export default function ScrollbarExample() {
	return (
		<div className="scrollbar-example">
			<Tldraw
				persistenceKey="scrollbar-example"
				cameraOptions={CAMERA_OPTIONS}
				components={{
					NavigationPanel: null,
				}}
			/>
		</div>
	)
}
