import { DEFAULT_CAMERA_OPTIONS, Tldraw, TLUiOverrides } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const overrides: TLUiOverrides = {
	actions(editor, actions) {
		actions.lockCameraZoom = {
			id: 'lock-camera-zoom',
			kbd: 'shift+k',
			onSelect() {
				// [1]
				const isLocked = editor.getCameraOptions().zoomSteps.length === 1
				editor.setCameraOptions({
					zoomSteps: isLocked ? DEFAULT_CAMERA_OPTIONS.zoomSteps : [editor.getZoomLevel()],
				})
			},
		}

		return actions
	},
}

export default function LockCameraZoomExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="lock-camera-zoom-example" overrides={overrides} />
		</div>
	)
}

/*
[1]
The camera can only zoom to values in `zoomSteps` (or between the smallest and largest of them). With a
single step equal to the current zoom, every zoom gesture, shortcut, and menu action is a no-op, so the
zoom is effectively locked. Restoring the default steps unlocks it. We use `zoomSteps.length === 1` as
the "is locked" flag so the same shortcut toggles both ways.
*/
