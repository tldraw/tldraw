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

/**
 * This example demonstrates how to enable focus mode when the editor mounts.
 *
 * [1] The editor's instance state is updated on mount to enable focus mode.
 */
