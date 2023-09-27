import { TLEventInfo, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'

export default function CanvasEventsExample() {
	const [events, setEvents] = useState<string[]>([])

	const handleEvent = useCallback((data: TLEventInfo) => {
		setEvents((events) => [JSON.stringify(data, null, 2), ...events.slice(0, 100)])
	}, [])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '50vw', height: '100vh' }}>
				<Tldraw
					onMount={(editor) => {
						editor.on('event', (event) => handleEvent(event))
					}}
				/>
			</div>
			<div>
				<div
					style={{
						width: '50vw',
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
						whiteSpace: 'pre-wrap',
					}}
				>
					{events.map((t, i) => (
						<div key={i}>{t}</div>
					))}
				</div>
			</div>
		</div>
	)
}
