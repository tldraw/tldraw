import { useSyncDemo } from '@tldraw/sync'
import { useState } from 'react'
import { TLUserPreferences, Tldraw, useTldrawUser } from 'tldraw'
import 'tldraw/tldraw.css'

export default function SyncCustomUserExample({ roomId }: { roomId: string }) {
	// [1]
	const [userPreferences, setUserPreferences] = useState<TLUserPreferences>({
		id: 'user-' + Math.random(),
		name: 'Jimmothy',
		color: 'palevioletred',
		colorScheme: 'dark',
	})

	// [2]
	const store = useSyncDemo({ roomId, userInfo: userPreferences })

	// [3]
	const user = useTldrawUser({ userPreferences, setUserPreferences })

	// [4]
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} user={user} deepLinks />
		</div>
	)
}

/**
 * # Sync Custom User
 *
 * This example demonstrates how to use the sync demo server with a custom user.
 *
 * You need access to two things to do this integration:
 *
 * - The user info
 * - A function to set the user info
 *
 * In this example we create an in-memory state for the user info, but in your system it's probably synchronized with a backend database somehow.
 *
 * 1. We get our user info and a function to set it from a `useState` hook. In your app this might come from a context provider or you might hook it up manually to your backend.
 * 2. We use the `useSyncDemo` hook to create the multiplayer store, and pass in the current user state as `userInfo`, which is a subset of the `userPreferences` type.
 * 3. We use the `useTLUser` hook to create a TLUser object, which allows the Editor to both read and update the user info and preferences.
 * 4. We render the `Tldraw` component with the multiplayer store and the user object.
 *
 * You can pass the same `user` object into the `useSync` hook if you're using your own server.
 */
