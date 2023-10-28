import { TLUiEventHandler, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'

export default function UiEventsExample() {
	const [uiEvents, setUiEvents] = useState<string[]>([])

	const handleUiEvent = useCallback<TLUiEventHandler>((name, data) => {
		setUiEvents((events) => [`${name} ${JSON.stringify(data)}`, ...events])
	}, [])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '60vw', height: '100vh' }}>
				<Tldraw onUiEvent={handleUiEvent} />
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
