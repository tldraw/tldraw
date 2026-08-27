import { useCallback, useEffect, useState } from 'react'
import { TLUiEventHandler, Tldraw, react, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
function sendToAnalytics(name: string, params: Record<string, unknown>) {
	// Replace this with your analytics provider's capture call
	console.debug('[analytics]', name, params)
}

interface LoggedEvent {
	name: string
	params: Record<string, unknown>
}

function AnalyticsTracker({
	onEvent,
}: {
	onEvent: (name: string, params: Record<string, unknown>) => void
}) {
	const editor = useEditor()

	// [3]
	useEffect(() => {
		const disposables = [
			editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
				onEvent('shape_created', { shape_type: shape.type })
			}),
			editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
				onEvent('shape_deleted', { shape_type: shape.type })
			}),
		]

		// [4]
		let debounceTimer: ReturnType<typeof setTimeout> | undefined
		let lastReported = ''
		disposables.push(
			react('track selection', () => {
				const ids = editor.getSelectedShapeIds()
				clearTimeout(debounceTimer)
				if (ids.length === 0) {
					// clearing the selection re-arms the dedup, so re-selecting the
					// same shape counts as a new interaction
					lastReported = ''
					return
				}
				debounceTimer = setTimeout(() => {
					const key = ids.join()
					if (key === lastReported) return
					lastReported = key
					const types = [...new Set(editor.getSelectedShapes().map((s) => s.type))]
					onEvent('shapes_selected', { count: ids.length, shape_types: types.join(',') })
				}, 250)
			})
		)

		return () => {
			clearTimeout(debounceTimer)
			disposables.forEach((dispose) => dispose())
		}
	}, [editor, onEvent])

	return null
}

export default function AnalyticsEventsExample() {
	const [log, setLog] = useState<LoggedEvent[]>([])

	const trackEvent = useCallback((name: string, params: Record<string, unknown>) => {
		sendToAnalytics(name, params)
		setLog((events) => [{ name, params }, ...events].slice(0, 50))
	}, [])

	// [2]
	const handleUiEvent = useCallback<TLUiEventHandler>(
		(name, data) => {
			if (name === 'select-tool') {
				const { id, source } = data as { id: string; source: string }
				trackEvent('tool_selected', { tool_id: id, source })
			}
		},
		[trackEvent]
	)

	return (
		<div style={{ display: 'flex', height: '100%' }}>
			<div style={{ flex: 1, position: 'relative' }}>
				<Tldraw persistenceKey="analytics-events-example" onUiEvent={handleUiEvent}>
					<AnalyticsTracker onEvent={trackEvent} />
				</Tldraw>
			</div>
			<div
				style={{
					width: 320,
					overflowY: 'auto',
					padding: 12,
					fontFamily: 'monospace',
					fontSize: 12,
					lineHeight: 1.5,
					borderLeft: '1px solid #8884',
				}}
			>
				<div style={{ marginBottom: 8 }}>Analytics events recorded:</div>
				{log.map((event, i) => (
					<div key={log.length - i} style={{ marginBottom: 6 }}>
						<strong>{event.name}</strong>
						<div style={{ opacity: 0.7 }}>{JSON.stringify(event.params)}</div>
					</div>
				))}
			</div>
		</div>
	)
}

/*
This example shows one way you could instrument a tldraw app with product
analytics. It tracks three kinds of events, each observed from a different
layer of the SDK:

- tool selection, from the `onUiEvent` prop
- shape creation and deletion, from the store's side effects
- selection (which shapes users click on), from a reactive signal

The right-hand panel shows every event as it is sent.

[1]
Every event funnels through this one function, so it is the only place that
knows about your analytics provider: replace its body with the capture call
from whichever service you use. Keeping a single seam also gives you one place
to add shared properties (a session id, the document id) to every event.

[2]
The `onUiEvent` prop fires for every high-level action the default UI performs,
whichever way it was triggered, and its `source` property tells you whether it
came from the toolbar, a menu, or a keyboard shortcut. We track `select-tool`
here; see the `TLUiEventMap` type or the ui events example for everything else
it reports. Note that it only fires for the default UI: calling
`editor.setCurrentTool` yourself does not report a UI event.

[3]
Side effects are the cleanest hook for document changes. The after-create and
after-delete handlers fire for every shape record, no matter how it was made:
drawn, pasted, duplicated, or created by an undo or redo. If you want to count
only direct user actions and ignore undo, redo, and remote collaborators,
listen with `editor.store.listen(handler, { scope: 'document', source: 'user' })`
and read the added records from each change diff instead.

Each register call returns an unregister function; the effect's cleanup calls
them all, so the handlers detach cleanly if the component unmounts.

[4]
Selection is derived state, so the reactive `react` function is the right
observer: it re-runs whenever `editor.getSelectedShapeIds()` changes. Raw
selection changes are noisy (a drag-select can change the selection every
frame), so we debounce for 250ms and skip duplicates before reporting: a real
analytics pipeline should receive intents, not frames. The same pattern tracks
any derived state: the current tool, the current page, the camera's zoom level.

In a production app you would also batch: accumulate events in memory and flush
them on an interval and on the page's `visibilitychange` (via `sendBeacon`),
rather than sending one network request per event. Some providers' scripts do
this batching for you; check yours before building it.
*/
