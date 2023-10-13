import { Tldraw, createTLStore, defaultShapeUtils, throttle } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useLayoutEffect, useState } from 'react'

const PERSISTENCE_KEY = 'example-3'

export default function PersistenceExample() {
	const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }))
	const [loadingState, setLoadingState] = useState<
		{ status: 'loading' } | { status: 'ready' } | { status: 'error'; error: string }
	>({
		status: 'loading',
	})

	useLayoutEffect(() => {
		setLoadingState({ status: 'loading' })

		// Get persisted data from local storage
		const persistedSnapshot = localStorage.getItem(PERSISTENCE_KEY)

		if (persistedSnapshot) {
			try {
				const snapshot = JSON.parse(persistedSnapshot)
				store.loadSnapshot(snapshot)
				setLoadingState({ status: 'ready' })
			} catch (error: any) {
				setLoadingState({ status: 'error', error: error.message }) // Something went wrong
			}
		} else {
			setLoadingState({ status: 'ready' }) // Nothing persisted, continue with the empty store
		}

		// Each time the store changes, run the (debounced) persist function
		const cleanupFn = store.listen(
			throttle(() => {
				const snapshot = store.getSnapshot()
				localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(snapshot))
			}, 500)
		)

		return () => {
			cleanupFn()
		}
	}, [store])

	if (loadingState.status === 'loading') {
		return (
			<div className="tldraw__editor">
				<h2>Loading...</h2>
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
