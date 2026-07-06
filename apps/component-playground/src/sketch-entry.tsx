import 'tldraw/tldraw.css'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Env, SET_STATE } from './channel'
import { EditorHarness, IsolatedHarness } from './harness'
import { LoadedSketch, sketchesById } from './registry'

const DEFAULT_ENV: Env = { theme: 'light', locale: 'en' }

// This module is the preview document embedded in the studio's iframe. It renders
// exactly one sketch (chosen by the `?id=` query), inside a harness driven by the
// theme/locale env, and re-renders from the args + env the shell pushes over the channel.
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
	const [env, setEnv] = useState<Env>(DEFAULT_ENV)

	useEffect(() => {
		function onMessage(event: MessageEvent) {
			if (event.origin !== window.location.origin) return
			const data = event.data
			if (!data || data.type !== SET_STATE || data.id !== id) return
			setArgs({ ...data.args })
			setEnv(data.env)
		}
		window.addEventListener('message', onMessage)
		return () => window.removeEventListener('message', onMessage)
	}, [id])

	if (!loaded) return <p className="preview__missing">Unknown sketch: {id ?? '(none)'}</p>

	const content = render(loaded, args)
	if ((loaded.sketchbook.harness ?? 'isolated') === 'editor') {
		return <EditorHarness env={env}>{content}</EditorHarness>
	}
	return <IsolatedHarness env={env}>{content}</IsolatedHarness>
}

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

createRoot(root).render(
	<StrictMode>
		<Preview />
	</StrictMode>
)
