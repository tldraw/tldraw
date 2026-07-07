import 'tldraw/tldraw.css'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Env, SET_STATE } from './channel'
import { EditorHarness, IsolatedHarness } from './harness'
import { sketchesById } from './registry'
import { renderSketch } from './render-sketch'

const DEFAULT_ENV: Env = { theme: 'light', locale: 'en' }

// This module is the preview document embedded in the studio's iframe. It renders
// exactly one sketch (chosen by the `?id=` query), inside a harness driven by the
// theme/locale env, and re-renders from the args + env the shell pushes over the channel.

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

	const content = renderSketch(loaded, args)
	if ((loaded.sketchbook.harness ?? 'isolated') === 'editor') {
		return <EditorHarness env={env}>{content}</EditorHarness>
	}
	// Viewport scenes (flows, toolbar) fill the frame; components stay centered.
	const fill = Boolean(loaded.sketch.parameters?.viewport)
	return (
		<IsolatedHarness env={env} fill={fill}>
			{content}
		</IsolatedHarness>
	)
}

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

createRoot(root).render(
	<StrictMode>
		<Preview />
	</StrictMode>
)
