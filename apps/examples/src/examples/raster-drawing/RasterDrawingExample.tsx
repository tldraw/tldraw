import { useLayoutEffect } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { RasterRenderer } from './RasterRenderer'

export default function RasterDrawingExample() {
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
				tools={[]}
				overrides={{
					tools: (_editor, tools) => {
						for (const key in tools) {
							if (key === 'draw' || key === 'select') continue
							delete tools[key]
						}
						return tools
					},
				}}
				persistenceKey="example"
				components={{
					// We're replacing the Background component with our custom renderer
					Background: RasterRenderer,
					// Even though we're hiding the shapes, we'll still do a bunch of work
					// in react to figure out which shapes to create. In reality, you might
					// want to set the Canvas component to null and render it all yourself.
					// Canvas: null,
				}}
			/>
		</div>
	)
}
