import { Fragment, useCallback, useState } from 'react'
import { TLUiEventHandler, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { getCodeSnippet } from './codeSnippets'

// There's a guide at the bottom of this file!

export default function UiEventsExample() {
	const [uiEvents, setUiEvents] = useState<string[]>([])

	const handleUiEvent = useCallback<TLUiEventHandler>((name, data: any) => {
		const codeSnippet = getCodeSnippet(name, data)
		setUiEvents((events) => [
			...events,
			`event: ${name} ${JSON.stringify(data)}${codeSnippet && `\ncode:  ${codeSnippet}`}`,
		])
	}, [])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '60%', height: '100vh' }}>
				<Tldraw onUiEvent={handleUiEvent} />
			</div>
			<div
				style={{
					width: '40%',
					height: '100vh',
					padding: 8,
					background: '#eee',
					border: 'none',
					fontFamily: 'monospace',
					fontSize: 12,
					borderLeft: 'solid 2px #333',
					overflow: 'auto',
				}}
				onCopy={(event) => event.stopPropagation()}
			>
				{uiEvents.map((t, i) => (
					<Fragment key={i}>
						<pre style={{ borderBottom: '1px solid #000', marginBottom: 0, paddingBottom: '12px' }}>
							{t}
						</pre>
					</Fragment>
				))}
			</div>
		</div>
	)
}

/* 
This example shows how to listen to UI events. This includes includes things like selecting a tool,
grouping shapes, zooming etc. Events are included even if they are triggered by a keyboard shortcut.
However, interactions with the style panel are not included. For a full list of events and sources,
check out the TLUiEventSource and TLUiEventMap types.

It also shows the relevant code snippet for each event. This is useful for debugging and learning
the tldraw SDK.

We can pass a handler function to the onUiEvent prop of the Tldraw component. This handler function
will be called with the name of the event and the data associated with the event. We're going to 
display these events in a list on the right side of the screen.

To listen to canvas events or changes to the store, check out the canvas events and store events 
examples.

*/
