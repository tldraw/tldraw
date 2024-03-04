import { useCallback, useState } from 'react'
import { TLEventInfo, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

export default function CanvasEventsExample() {
	const [events, setEvents] = useState<any[]>([])

	const handleEvent = useCallback((data: TLEventInfo) => {
		setEvents((events) => {
			const newEvents = events.slice(0, 100)
			if (
				newEvents[newEvents.length - 1] &&
				newEvents[newEvents.length - 1].type === 'pointer' &&
				data.type === 'pointer' &&
				data.target === 'canvas'
			) {
				newEvents[newEvents.length - 1] = data
			} else {
				newEvents.unshift(data)
			}
			return newEvents
		})
	}, [])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '50%', height: '100vh' }}>
				<Tldraw
					onMount={(editor) => {
						editor.on('event', (event) => handleEvent(event))
					}}
				/>
			</div>
			<div
				style={{
					width: '50%',
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
				onCopy={(event) => event.stopPropagation()}
			>
				<div>{JSON.stringify(events, undefined, 2)}</div>
			</div>
		</div>
	)
}

/* 
This example shows how to listen to canvas events. This includes things like pointer and 
keyboard events, but not things such as undo/redo, create/delete shapes, etc. Those are store events.

To listen to changes to the store, check out the store events example.
*/
