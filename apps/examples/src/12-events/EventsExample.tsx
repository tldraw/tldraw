import { App, TLEventMapHandler, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { TLUiEventHandler } from '@tldraw/ui/src/lib/hooks/useEventsProvider'
import { useCallback, useEffect, useState } from 'react'

export default function Example() {
	const [app, setApp] = useState<App>()

	const setAppToState = useCallback((app: App) => {
		setApp(app)
	}, [])

	const [uiEvents, setUiEvents] = useState<string[]>([])

	const handleEvent = useCallback<TLUiEventHandler>((source, name, data) => {
		setUiEvents((events) => [
			data ? `${source} ${name} ${JSON.stringify(data)}` : `${source} ${name}`,
			...events,
		])
	}, [])

	useEffect(() => {
		if (!app) return

		function logChangeEvent(eventName: string) {
			setUiEvents((events) => [eventName, ...events])
		}

		// This is the fire hose, it will be called at the end of every transaction
		const handleChangeEvent: TLEventMapHandler<'change'> = (change) => {
			if (change.source === 'user') {
				// Added
				for (const record of Object.values(change.changes.added)) {
					if (record.typeName === 'shape') {
						logChangeEvent(`created shape (${record.type})`)
					}
				}

				// Updated
				for (const [from, to] of Object.values(change.changes.updated)) {
					if (
						from.typeName === 'instance' &&
						to.typeName === 'instance' &&
						from.currentPageId !== to.currentPageId
					) {
						logChangeEvent(`changed page (${from.currentPageId}, ${to.currentPageId})`)
					}
				}

				// Removed
				for (const record of Object.values(change.changes.removed)) {
					if (record.typeName === 'shape') {
						logChangeEvent(`deleted shape (${record.type})`)
					}
				}
			}
		}

		app.on('change', handleChangeEvent)

		return () => {
			app.off('change', handleChangeEvent)
		}
	}, [app])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '60vw', height: '100vh' }}>
				<Tldraw autoFocus onMount={setAppToState} onEvent={handleEvent} />
			</div>
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
		</div>
	)
}
