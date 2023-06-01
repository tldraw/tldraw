import { Canvas, ContextMenu, TAB_ID, TldrawEditor, TldrawUi, createTLStore } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { throttle } from '@tldraw/utils'
import { useLayoutEffect, useState } from 'react'

const PERSISTENCE_KEY = 'example-3'

export default function PersistenceExample() {
	const [store] = useState(() => createTLStore({ instanceId: TAB_ID }))
	const [loadingStore, setLoadingStore] = useState<
		{ status: 'loading' } | { status: 'ready' } | { status: 'error'; error: string }
	>({
		status: 'loading',
	})

	useLayoutEffect(() => {
		setLoadingStore({ status: 'loading' })

		// Get persisted data from local storage
		const persistedSnapshot = localStorage.getItem(PERSISTENCE_KEY)

		if (persistedSnapshot) {
			try {
				const snapshot = JSON.parse(persistedSnapshot)
				store.loadSnapshot(snapshot)
				setLoadingStore({ status: 'ready' })
			} catch (error: any) {
				setLoadingStore({ status: 'error', error: error.message }) // Something went wrong
			}
		} else {
			setLoadingStore({ status: 'ready' }) // Nothing persisted, continue with the empty store
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

	if (loadingStore.status === 'loading') {
		return (
			<div className="tldraw__editor">
				<h2>Loading...</h2>
			</div>
		)
	}

	if (loadingStore.status === 'error') {
		return (
			<div className="tldraw__editor">
				<h2>Error!</h2>
				<p>{loadingStore.error}</p>
			</div>
		)
	}

	return (
		<div className="tldraw__editor">
			<TldrawEditor store={store} autoFocus>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
