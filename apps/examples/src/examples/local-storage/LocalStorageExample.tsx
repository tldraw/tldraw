import { useLayoutEffect, useState } from 'react'
import { Tldraw, createTLStore, defaultShapeUtils, throttle } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const PERSISTENCE_KEY = 'example-3'

export default function PersistenceExample() {
	//[1]
	const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }))
	//[2]
	const [loadingState, setLoadingState] = useState<
		{ status: 'loading' } | { status: 'ready' } | { status: 'error'; error: string }
	>({
		status: 'loading',
	})
	//[3]
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

	// [4]
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

/*
This example shows how to implement persistence in the Tldraw component. We do
this by saving the editor's state to local storage each time it changes. You 
should replace this in your app with some sort of backend storage solution. If 
you just want to save to local storage, you can use the `persistenceKey` prop
instead. Simply pass any string to this prop and the editor will automatically 
save to local storage.

[1]
We create a new store using the `createTLStore` helper function. We pass in the 
default shape utils so that the store knows how to handle the built-in shapes. 
We also wrap this in a `useState` hook so that the store is only created once.

[2]
This is a cool pattern that uses Typescript to help keep track of our app's
loading state.

[3]
We use the `useLayoutEffect` hook to run our persistence code after the first
render. First we grab the persisted snapshot from local storage. If there is
one, we load it into the store and set the loading state to ready. If there
isn't one, we just set the loading state to ready.

Then we setup a listener on the store that will run our persistence code each
time the store changes. We use the `throttle` helper function to debounce the
listener so that it doesn't run too often. We also return a cleanup function
that will remove the listener when the component unmounts.

[4]
This is where we render our application depending on the loading state. If the
loading state is `loading`, we render a loading message. If the loading state
is `error`, we render an error message. If the loading state is `ready`, we
render the Tldraw component.
*/
