import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function FocusModeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// [1]
					editor.updateInstanceState({ isFocusMode: true })
				}}
			/>
		</div>
	)
}

/*
[1]
Focus mode is a flag on the editor's instance state. `updateInstanceState` sets it; the default UI
reads it and hides everything except a small exit button. When a `persistenceKey` is used, this
flag is preserved as a user preference, so setting it in `onMount` forces it on regardless.
*/
