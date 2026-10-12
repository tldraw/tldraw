import { useEffect } from 'react'
import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function FloatyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_floaty_example">
				<FloatyWindow />
			</Tldraw>
		</div>
	)
}

// [1]
function FloatyWindow() {
	const editor = useEditor()

	useEffect(() => {
		let x = window.screenX
		let y = window.screenY

		// [2]
		function updateCamera() {
			if (window.screenX === x && window.screenY === y) return
			x = window.screenX
			y = window.screenY
			editor.setCamera({ x: -x, y: -y })
		}

		// [3]
		editor.on('tick', updateCamera)
		return () => {
			editor.off('tick', updateCamera)
		}
	}, [editor])

	return null
}

/*
Moving the browser window across the screen pans the camera by the same amount, so the
canvas looks like it's pinned to the desktop while the window slides over it. This was
[popular on social media](https://x.com/steveruizok/status/1727436505440981099) for a while.

[1]
Any component rendered as a child of `<Tldraw>` can call `useEditor()`, so this hook
component runs its effect once the editor exists and renders nothing.

[2]
`window.screenX` / `screenY` are the window's position on the screen. When they change,
the camera is set to the negative of that offset so page space stays fixed relative to
the screen. Camera coordinates are page-space, so this is exact at zoom 1.

[3]
There's no DOM event for the window moving, so we poll on the editor's `tick` event and
unsubscribe in the effect cleanup.
*/
