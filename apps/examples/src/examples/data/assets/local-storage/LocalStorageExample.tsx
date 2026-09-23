import throttle from 'lodash/throttle'
import { useLayoutEffect, useMemo, useState } from 'react'
import { DefaultSpinner, Tldraw, createTLStore, getSnapshot, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const PERSISTENCE_KEY = 'example-3'

export default function LocalStorageExample() {
	// [1]
	const store = useMemo(() => createTLStore(), [])
	// [2]
	const [loadingState, setLoadingState] = useState<
		{ status: 'loading' } | { status: 'ready' } | { status: 'error'; error: string }
	>({
		status: 'loading',
	})
	// [3]
	useLayoutEffect(() => {
		setLoadingState({ status: 'loading' })

		const persistedSnapshot = localStorage.getItem(PERSISTENCE_KEY)

		if (persistedSnapshot) {
			try {
				const snapshot = JSON.parse(persistedSnapshot)
				loadSnapshot(store, snapshot)
				setLoadingState({ status: 'ready' })
			} catch (error: any) {
				setLoadingState({ status: 'error', error: error.message })
			}
		} else {
			setLoadingState({ status: 'ready' })
		}

		// [4]
		const cleanupFn = store.listen(
			throttle(() => {
				const snapshot = getSnapshot(store)
				localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(snapshot))
			}, 500)
		)

		return () => {
			cleanupFn()
		}
	}, [store])

	// [5]
	if (loadingState.status === 'loading') {
		return (
			<div className="tldraw__editor">
				<h2>
					<DefaultSpinner />
				</h2>
			</div>
		)
	}

	if (loadingState.status === 'error') {
		return (
			<div className="tldraw__editor">
				<h2>Error!</h2>
				<p>{loadingState.error}</p>
			</div>
		)
	}

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} />
		</div>
	)
}

/*
If all you want is local persistence, pass a `persistenceKey` to `Tldraw` and it will
save to IndexedDB for you. This example does the load/save loop by hand against
`localStorage` so you can see the pieces, and swap `localStorage` for your own backend.

[1]
Create the store ourselves rather than letting `Tldraw` do it, so we can load a snapshot
into it before the editor mounts. `useMemo` keeps it stable across renders.

[2]
A discriminated union for the loading state keeps the "error" branch from needing an
`error` field on the other states.

[3]
`useLayoutEffect` runs before the first paint, so if there's a saved snapshot the store
is populated before `Tldraw` renders. `loadSnapshot` replaces the store's contents and
runs any migrations needed for an older snapshot.

[4]
`store.listen` fires on every change. Serializing the whole document each time would be
wasteful, so the listener is throttled. The returned function removes the listener when
the component unmounts.

[5]
Render a spinner while loading, an error if the saved data couldn't be parsed, and the
editor once the store is ready.
*/
