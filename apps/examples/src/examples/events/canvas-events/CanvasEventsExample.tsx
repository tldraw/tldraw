import { useCallback, useState } from 'react'
import { TLEventInfo, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './canvas-events.css'

// There's a guide at the bottom of this file!

type TimedEvent = TLEventInfo & { lastUpdated: number }

export default function CanvasEventsExample() {
	const [events, setEvents] = useState<Record<string, TimedEvent>>({})

	// [1]
	const handleEvent = useCallback((data: TLEventInfo) => {
		setEvents((prevEvents) => ({
			...prevEvents,
			[data.type]: {
				...data,
				lastUpdated: Date.now(),
			},
		}))
	}, [])

	const eventsArray = Object.values(events).sort((a, b) => a.lastUpdated - b.lastUpdated)

	return (
		<div className="canvas-events">
			<div className="canvas-events__editor">
				<Tldraw
					onMount={(editor) => {
						// [2]
						editor.on('event', handleEvent)
						return () => {
							editor.off('event', handleEvent)
						}
					}}
				/>
			</div>
			<div className="canvas-events__log" onCopy={(event) => event.stopPropagation()}>
				<pre>{JSON.stringify(eventsArray, undefined, 2)}</pre>
			</div>
		</div>
	)
}

/*
Canvas events are the low-level input events the editor dispatches to its tools: pointer,
keyboard, wheel, pinch, tick and so on. They don't cover document changes like creating or
deleting shapes; for those, see the store events example. For higher-level UI actions like
"zoom in" or "select tool", see the UI events example.

[1]
Pointer moves and ticks fire many times a second, so logging every event would be unreadable.
Instead we keep the latest event of each type, keyed by `type`, and show them ordered by when
they last fired.

[2]
`Editor` is an event emitter. Subscribing to `'event'` gives you every `TLEventInfo` the editor
handles, after its own processing. `onMount` can return a cleanup function, which is the right
place to unsubscribe.
*/
