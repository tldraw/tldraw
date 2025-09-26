import { useCallback, useState } from 'react'
import { TLEventInfo, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!
type TimedEvent = TLEventInfo & { lastUpdated: number }

export default function CanvasEventsExample() {
	const [events, setEvents] = useState<Record<string, TimedEvent>>({})

	const handleEvent = useCallback((data: TLEventInfo) => {
		// Update the event entry for this event type with new data
		// This replaces previous event data of this type completely, keeping one per type
		setEvents((prevEvents) => ({
			...prevEvents,
			[data.type]: {
			...data,
			lastUpdated: Date.now(),
			},
		}))
	}, [])

	// Convert events to array and sort by lastUpdated descending (most recent first)
	const eventsArray = Object.values(events).sort(
		(a, b) => a.lastUpdated - b.lastUpdated
	)

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
				<pre>{JSON.stringify(eventsArray, undefined, 2)}</pre>
			</div>
		</div>
	)
}

/* 
This example shows how to listen to canvas events. This includes things like pointer and 
keyboard events, but not things such as undo/redo, create/delete shapes, etc. Those are store events.

To listen to changes to the store, check out the store events example.
*/