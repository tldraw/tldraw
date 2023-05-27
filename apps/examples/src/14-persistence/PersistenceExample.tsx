import {
	Canvas,
	ContextMenu,
	TAB_ID,
	TldrawEditor,
	TldrawEditorConfig,
	TldrawUi,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { throttle } from '@tldraw/utils'
import { useEffect, useState } from 'react'

const PERSISTENCE_KEY = 'example-3'
const config = new TldrawEditorConfig()
const instanceId = TAB_ID
const store = config.createStore({ instanceId })

export default function PersistenceExample() {
	const [state, setState] = useState<
		| {
				name: 'loading'
		  }
		| {
				name: 'ready'
		  }
		| {
				name: 'error'
				error: string
		  }
	>({ name: 'loading', error: undefined })

	useEffect(() => {
		setState({ name: 'loading' })

		// Get persisted data from local storage
		const persistedSnapshot = localStorage.getItem(PERSISTENCE_KEY)

		if (persistedSnapshot) {
			try {
				const snapshot = JSON.parse(persistedSnapshot)
				store.loadSnapshot(snapshot)
				setState({ name: 'ready' })
			} catch (e: any) {
				setState({ name: 'error', error: e.message }) // Something went wrong
			}
		} else {
			setState({ name: 'ready' }) // Nothing persisted, continue with the empty store
		}

		const persist = throttle(() => {
			// Each time the store changes, persist the store snapshot
			const snapshot = store.getSnapshot()
			localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(snapshot))
		}, 1000)

		// Each time the store changes, run the (debounced) persist function
		const cleanupFn = store.listen(persist)

		return () => {
			cleanupFn()
		}
	}, [])

	if (state.name === 'loading') {
		return (
			<div>
				<h2>Loading...</h2>
			</div>
		)
	}

	if (state.name === 'error') {
		return (
			<div>
				<h2>Error!</h2>
				<p>{state.error}</p>
			</div>
		)
	}

	return (
		<div className="tldraw__editor">
			<TldrawEditor instanceId={instanceId} store={store} config={config} autoFocus>
				<TldrawUi>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}
