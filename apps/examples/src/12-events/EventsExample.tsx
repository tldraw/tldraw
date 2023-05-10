import { App, TLEventMap, TLEventMapHandler, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useCallback, useEffect, useState } from 'react'

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

const SIMPLE_LIST: (keyof TLEventMap)[] = [
	'mount',
	'duplicate-shapes',
	'zoom-in',
	'zoom-out',
	'group-shapes',
	'ungroup-shapes',
]

function TrackEvents({ app }: { app: App }) {
	const [uiEvents, setUiEvents] = useState<string[]>([])

	useEffect(() => {
		function logEvent(eventName: string) {
			setUiEvents((events) => [eventName, ...events])
		}

		// Track simple events
		SIMPLE_LIST.forEach((eventName) => {
			app.on(eventName, () => logEvent(eventName))
		})

		// Track more complex events, where we want to send additional data
		const handleSelectToolEvent: TLEventMapHandler<'select-tool'> = ({ id }) => {
			logEvent(`select-tool (${id})`)
		}

		const handleChangePathEvent: TLEventMapHandler<'change-path'> = ({ path }) => {
			logEvent(`change-path (${path})`)
		}

		// This is the fire hose, it will be called at the end of every transaction
		const handleChangeEvent: TLEventMapHandler<'change'> = (change) => {
			if (change.source === 'user') {
				// Added
				for (const record of Object.values(change.changes.added)) {
					if (record.typeName === 'shape') {
						logEvent(`created shape (${record.type})`)
					}
				}

				// Updated
				for (const [from, to] of Object.values(change.changes.updated)) {
					if (
						from.typeName === 'instance' &&
						to.typeName === 'instance' &&
						from.currentPageId !== to.currentPageId
					) {
						logEvent(`changed page (${from.currentPageId}, ${to.currentPageId})`)
					}
				}

				// Removed
				for (const record of Object.values(change.changes.removed)) {
					if (record.typeName === 'shape') {
						logEvent(`deleted shape (${record.type})`)
					}
				}
			}
		}

		app.on('select-tool', handleSelectToolEvent)
		app.on('change-path', handleChangePathEvent)
		app.on('change', handleChangeEvent)

		return () => {
			SIMPLE_LIST.forEach((eventName) => app.off(eventName))
			app.off('select-tool', handleSelectToolEvent)
			app.off('change-path', handleChangePathEvent)
			app.off('change', handleChangeEvent)
		}
	}, [app])

	return (
		<div>
			<div
				style={{
					width: '40vw',
					height: '100vh',
					padding: 8,
					background: '#eee',
					border: 'none',
					fontFamily: 'monospace',
					fontSize: 12,
					borderLeft: 'solid 2px #333',
					display: 'flex',
					flexDirection: 'column-reverse',
					overflow: 'auto',
				}}
			>
				{uiEvents.map((t, i) => (
					<div key={i}>{t}</div>
				))}
			</div>
		</div>
	)
}
