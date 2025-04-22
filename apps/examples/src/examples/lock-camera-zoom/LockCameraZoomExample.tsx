import { Tldraw, TLUiOverrides } from 'tldraw'
import 'tldraw/tldraw.css'

const DEFAULT_CAMERA_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8]

const overrides: TLUiOverrides = {
	actions(editor, actions) {
		actions.lockCameraZoom = {
			id: 'lock-camera-zoom',
			kbd: 'shift+k',
			onSelect() {
				const isCameraZoomLockedAlready = editor.getCameraOptions().zoomSteps.length === 1
				editor.setCameraOptions({
					zoomSteps: isCameraZoomLockedAlready ? DEFAULT_CAMERA_STEPS : [editor.getZoomLevel()],
				})
			},
		}

		return actions
	},
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" overrides={overrides} />
		</div>
	)
}
