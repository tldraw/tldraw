import { TLEventInfo, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'

// There's a guide at the bottom of this file!

export default function CanvasEventsExample() {
	// [1]
	const [events, setEvents] = useState<string[]>([])
	// [2]
	const handleEvent = useCallback((data: TLEventInfo) => {
		setEvents((events) => [JSON.stringify(data, null, '\t'), ...events.slice(0, 100)])
	}, [])

	// [3]
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
			>
				{events.map((t, i) => (
					<div key={i}>{t}</div>
				))}
			</div>
		</div>
	)
}

/* 
This example shows how to listen to canvas events. This includes things like pointer and 
keyboard events, but not things such as undo/redo, create/delete shapes, etc. Those are store events.

[1]
This is where we store the events that we receive from the editor using a useState hook.

[2]
This is the callback that we pass to the editor's onMount prop. We have some logic in here to


[3]


To listen to changes to the store, check out the store events example.
*/
