import { useSyncDemo } from '@tldraw/sync'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	atom,
	computed,
	createUserId,
	Tldraw,
	TldrawOptions,
	TLUserPreferences,
	TLUserStore,
	UserRecordType,
	useTldrawCurrentUser,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

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
		return { currentUser }
	}, [userPrefsAtom])

	// [3]
	const store = useSyncDemo({ roomId, users })

	// [4]
	const user = useTldrawCurrentUser({ userPreferences, setUserPreferences })

	// [5]
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} user={user} options={options} />
		</div>
	)
}

const options: Partial<TldrawOptions> = { deepLinks: true }

/*
To plug your own identity into tldraw sync you need two things: the current user's info,
and a way to update it (so the editor's name and color controls can write back). Here
that's plain React state; in your app it would be your auth system.

[1]
The user's preferences. `useState` stands in for your user context or backend.

[2]
`useSyncDemo` wants a `TLUserStore`, whose `currentUser` is a reactive signal rather
than React state, so we bridge the two: an atom mirrors the state, and a computed
derives a `TLUser` record from it.

[3]
Create the multiplayer store, passing the user store. `useSync` (for your own server)
takes the same `users` option.

[4]
`useTldrawCurrentUser` turns the preferences and setter into the `TLCurrentUser` the
editor reads and writes for the local user's name, color, and settings.

[5]
Render with the synced store and the user object.
*/
