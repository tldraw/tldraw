import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LoadedSketch, sketchesById } from './registry'

// This module is the preview document embedded in the studio's iframe. It renders
// exactly one sketch, chosen by the `?id=` query the shell puts in the frame's src.
function renderSketch(loaded: LoadedSketch) {
	const { sketchbook, sketch } = loaded
	const args = sketch.args ?? {}
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
	if (!loaded) return <p className="preview__missing">Unknown sketch: {id ?? '(none)'}</p>
	return <div className="preview">{renderSketch(loaded)}</div>
}

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

createRoot(root).render(
	<StrictMode>
		<Preview />
	</StrictMode>
)
