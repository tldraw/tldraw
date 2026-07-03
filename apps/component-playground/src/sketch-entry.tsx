import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SET_ARGS } from './channel'
import { LoadedSketch, sketchesById } from './registry'

// This module is the preview document embedded in the studio's iframe. It renders
// exactly one sketch, chosen by the `?id=` query the shell puts in the frame's src,
// and re-renders it from args the shell pushes over postMessage (the controls).
function render(loaded: LoadedSketch, args: Record<string, unknown>) {
	const { sketchbook, sketch } = loaded
	if (sketch.render) return sketch.render(args)
	if (sketchbook.component) {
		const Component = sketchbook.component
		return <Component {...args} />
	}
	return <em>This sketch has no component or render().</em>
}

function Preview() {
	const id = new URLSearchParams(window.location.search).get('id') ?? undefined
	const loaded = id ? sketchesById.get(id) : undefined
	const [args, setArgs] = useState<Record<string, unknown>>(() => ({
		...(loaded?.sketch.args ?? {}),
	}))

	useEffect(() => {
		function onMessage(event: MessageEvent) {
			if (event.origin !== window.location.origin) return
			const data = event.data
			if (!data || data.type !== SET_ARGS || data.id !== id) return
			setArgs({ ...data.args })
		}
		window.addEventListener('message', onMessage)
		return () => window.removeEventListener('message', onMessage)
	}, [id])

	if (!loaded) return <p className="preview__missing">Unknown sketch: {id ?? '(none)'}</p>
	return <div className="preview">{render(loaded, args)}</div>
}

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

createRoot(root).render(
	<StrictMode>
		<Preview />
	</StrictMode>
)
