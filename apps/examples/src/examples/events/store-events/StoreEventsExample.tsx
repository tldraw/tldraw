import { useCallback, useState } from 'react'
import { isEqual, TLEventMapHandler, TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './store-events.css'

// There's a guide at the bottom of this file!

export default function StoreEventsExample() {
	const [storeEvents, setStoreEvents] = useState<string[]>([])

	// [1]
	const handleChangeEvent = useCallback<TLEventMapHandler<'change'>>((change) => {
		const messages: string[] = []

		for (const record of Object.values(change.changes.added)) {
			if (record.typeName === 'shape') {
				messages.push(`created shape (${record.type})`)
			}
		}

		for (const [from, to] of Object.values(change.changes.updated)) {
			if (from.typeName === 'instance' && to.typeName === 'instance') {
				if (from.currentPageId !== to.currentPageId) {
					messages.push(`changed page (${from.currentPageId}, ${to.currentPageId})`)
				}
			} else if (from.typeName === 'shape' && to.typeName === 'shape') {
				messages.push(`updated shape (${describeShapeDiff(from, to)})`)
			}
		}

		for (const record of Object.values(change.changes.removed)) {
			if (record.typeName === 'shape') {
				messages.push(`deleted shape (${record.type})`)
			}
		}

		if (messages.length) {
			setStoreEvents((events) => [...events, ...messages])
		}
	}, [])

	return (
		<div className="store-events">
			<div className="store-events__editor">
				<Tldraw
					onMount={(editor) => {
						// [2]
						return editor.store.listen(handleChangeEvent, { source: 'user', scope: 'all' })
					}}
				/>
			</div>
			<div className="store-events__log" onCopy={(event) => event.stopPropagation()}>
				<pre>{storeEvents.join('\n')}</pre>
			</div>
		</div>
	)
}

// [3]
function describeShapeDiff(from: TLShape, to: TLShape) {
	const changed: string[] = []
	for (const key of Object.keys(to) as (keyof TLShape)[]) {
		if (key === 'props') {
			for (const propKey of Object.keys(to.props)) {
				const a = (from.props as Record<string, unknown>)[propKey]
				const b = (to.props as Record<string, unknown>)[propKey]
				if (!isEqual(a, b)) changed.push(`props.${propKey}: ${JSON.stringify(b)}`)
			}
		} else if (!isEqual(from[key], to[key])) {
			changed.push(`${key}: ${JSON.stringify(to[key])}`)
		}
	}
	return changed.join(', ')
}

/*
Store events tell you what changed in the document: shapes created, updated, or deleted, pages
switched, and so on. They don't include input like pointer and keyboard events; for those, see
the canvas events example.

[1]
The listener receives a `HistoryEntry` for every transaction. Its `changes` is a `RecordsDiff`
with `added`, `updated`, and `removed` maps keyed by record id, and `updated` entries are
`[from, to]` pairs. Records of all types come through here (shapes, pages, the instance record,
camera, and so on), so we check `typeName` and turn the ones we care about into readable lines.

[2]
`editor.store.listen` returns an unsubscribe function, and `onMount` can return a cleanup
function, so returning one from the other is all the wiring needed. The filters restrict this
listener to changes made by the local user (`source: 'user'`, as opposed to `'remote'` changes
arriving from other clients) across all record scopes. Use `scope: 'document'` if you only care
about persisted document content and not things like the camera or selection.

[3]
Compare the two versions of an updated shape and list the top-level and `props` fields that
changed. Nested values like `richText` need a deep comparison, so this uses `isEqual`, which
tldraw re-exports from lodash.
*/
