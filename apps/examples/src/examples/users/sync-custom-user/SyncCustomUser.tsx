import { useSyncDemo } from '@tldraw/sync'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	atom,
	computed,
	createUserId,
	Tldraw,
	TLUserPreferences,
	TLUserStore,
	UserRecordType,
	useTldrawCurrentUser,
} from 'tldraw'
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
	const userPrefsAtom = useRef(atom<TLUserPreferences>('userPrefs', userPreferences)).current
	useEffect(() => {
		userPrefsAtom.set(userPreferences)
	}, [userPreferences, userPrefsAtom])

	const users: TLUserStore = useMemo(() => {
		const currentUser = computed('currentUser', () => {
			const p = userPrefsAtom.get()
			return UserRecordType.create({
				id: createUserId(p.id),
				name: p.name ?? '',
				color: p.color ?? '',
			})
		})
		return { getCurrentUser: () => currentUser }
	}, [userPrefsAtom])

	// [3]
	const store = useSyncDemo({ roomId, users })

	// [4]
	const user = useTldrawCurrentUser({ userPreferences, setUserPreferences })

	// [5]
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} user={user} options={{ deepLinks: true }} />
		</div>
	)
}

/**
 * # Sync custom user
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
 * 2. We bridge React state to a reactive atom, then create a `TLUserStore` whose `getCurrentUser()` returns a Signal derived from that atom.
 * 3. We use the `useSyncDemo` hook to create the multiplayer store, passing in the user store.
 * 4. We use the `useTldrawCurrentUser` hook to create a TLCurrentUser object, which allows the Editor to both read and update the user info and preferences.
 * 5. We render the `Tldraw` component with the multiplayer store and the user object.
 *
 * You can pass the same `users` store into the `useSync` hook if you're using your own server.
 */
