import { Editor, TLEventMapHandler, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useState } from 'react'

// There's a guide at the bottom of this file!

export default function StoreEventsExample() {
	const [editor, setEditor] = useState<Editor>()

	const setAppToState = useCallback((editor: Editor) => {
		setEditor(editor)
	}, [])

	const [storeEvents, setStoreEvents] = useState<string[]>([])

	useEffect(() => {
		if (!editor) return

		function logChangeEvent(eventName: string) {
			setStoreEvents((events) => [eventName, ...events])
		}

		//[1]
		const handleChangeEvent: TLEventMapHandler<'change'> = (change) => {
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

		// [2]
		const cleanupFunction = editor.store.listen(handleChangeEvent, { source: 'user', scope: 'all' })

		return () => {
			cleanupFunction()
		}
	}, [editor])

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '60%', height: '100vh' }}>
				<Tldraw onMount={setAppToState} />
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
					display: 'flex',
					flexDirection: 'column-reverse',
					overflow: 'auto',
				}}
			>
				{storeEvents.map((t, i) => (
					<div key={i}>{t}</div>
				))}
			</div>
		</div>
	)
}

/* 
This example shows how to listen to store events. This includes things creating/deleting shapes,
or moving between pages, but not things such as pointer and keyboard events. Those are canvas events.
To listen to changes to the canvas, check out the canvas events example.

[1]
This is the fire hose, it will be called at the end of every transaction. We're checking to see what 
kind of changes were made and logging a more readable message to the to our panel.

[2]
This is the function that subscribes to changes to the store. You pass in the callback function that 
you want to execute along with a handy filter object. In this case, we're only listening to changes
that were made by the user. It also returns a cleanup function that you can shove into the return of 
a useeffect hook.

*/
