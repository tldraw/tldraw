import { App, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useCallback, useEffect, useState } from 'react'
import { usePosthog } from './usePosthog'

export default function Example() {
	const [app, setApp] = useState<App>()

	const setAppToState = useCallback((app: App) => {
		setApp(app)
	}, [])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '60vw', height: '100vh' }}>
				<Tldraw autoFocus onMount={setAppToState} />
			</div>
			{app && <TrackEvents app={app} />}
		</div>
	)
}

const SIMPLE_LIST = [
	'mount',
	'align-shapes',
	'duplicate-shapes',
	'back-to-content',
	'duplicate-page',
	'distribute-shapes',
	'flip-shapes',
	'stretch-shapes',
	'group-shapes',
	'ungroup-shapes',
	'reorder-shapes',
	'change-page',
	'delete-shapes',
] as const

function TrackEvents({ app }: { app: App }) {
	const track = usePosthog(app.instanceId)

	const [uiEvents, setUiEvents] = useState<string[]>([])

	useEffect(() => {
		for (const eventName of SIMPLE_LIST) {
			app.on(eventName, () => {
				setUiEvents((e) => [...e, eventName])
			})
			track(eventName, {})
		}

		app.on('select-tool', ({ id }) => {
			setUiEvents((e) => [...e, `select-tool (${id})`])
			track('select-tool', { id })
		})

		app.on('create-shapes', ({ types }) => {
			setUiEvents((e) => [...e, `create-shapes (${types})`])
			track('create-shapes', { types })
		})

		return () => {
			for (const eventName of SIMPLE_LIST) {
				app.off(eventName)
			}

			app.off('select-tool')
			app.off('create-shapes')
		}
	}, [app, track])

	return (
		<textarea
			style={{
				width: '40vw',
				height: '100vh',
				padding: 8,
				background: '#eee',
				border: 'none',
				borderLeft: 'solid 2px #333',
			}}
			value={uiEvents.join('\n')}
			disabled={true}
		/>
	)
}
