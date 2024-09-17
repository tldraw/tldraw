import { useLayoutEffect } from 'react'
import { DefaultCanvas, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { CustomRenderer } from './CustomRenderer'

export default function CustomRendererExample() {
	useLayoutEffect(() => {
		// Hide the regular shapes layer using CSS.
		const script = document.createElement('style')
		if (!script) return
		script.innerHTML = `.tl-shapes { display: none; }`
		document.body.appendChild(script)
		return () => {
			script.remove()
		}
	})

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="example"
				components={{
					// We're replacing the Background component with our custom renderer
					Background: CustomRenderer,
					// Even though we're hiding the shapes, we'll still do a bunch of work
					// in react to figure out which shapes to create. In reality, you might
					// want to set the Canvas component to null and render it all yourself.
					Canvas: DefaultCanvas,
				}}
			/>
		</div>
	)
}
