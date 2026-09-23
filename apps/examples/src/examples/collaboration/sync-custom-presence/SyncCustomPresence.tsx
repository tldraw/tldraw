import { useSyncDemo } from '@tldraw/sync'
import { useEffect } from 'react'
import { Tldraw, getDefaultUserPresence, useAtom } from 'tldraw'
import 'tldraw/tldraw.css'

export default function SyncCustomPresenceExample({ roomId }: { roomId: string }) {
	// [1]
	const timer = useAtom('timer', Date.now())
	useEffect(() => {
		let frame = requestAnimationFrame(function tick() {
			timer.set(Date.now())
			frame = requestAnimationFrame(tick)
		})
		return () => cancelAnimationFrame(frame)
	}, [timer])

	// [2]
	const store = useSyncDemo({
		roomId,
		getUserPresence(store, user) {
			// [3]
			const defaults = getDefaultUserPresence(store, user)
			if (!defaults) return null

			return {
				...defaults,

				// [4]
				camera: undefined,

				// [5]
				cursor: {
					...defaults.cursor,
					x: defaults.cursor.x + 20 * Math.sin(timer.get() / 200),
					y: defaults.cursor.y + 20 * Math.cos(timer.get() / 200),
				},
			}
		},
	})

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} options={{ deepLinks: true }} />
		</div>
	)
}

/*
Presence is the per-user state (cursor, camera, selection, and so on) that sync broadcasts to every
other client. `getUserPresence` lets you change what gets sent: strip out fields your app doesn't
need, or add to them.

[1]
A timer that ticks every frame, held in an atom. `getUserPresence` runs inside a computed signal, so
reading the atom there re-derives the presence whenever it changes. You don't need this in a real
app; it's only here to animate the cursor.

[2]
`useSyncDemo` accepts a `getUserPresence` function that replaces the default derivation.

[3]
Start from `getDefaultUserPresence` so the usual fields are still sent. It returns null before the
editor's instance state exists, so pass that through.

[4]
Setting a field to `undefined` drops it, and the record falls back to its default (`null` here). Other
clients won't be able to follow this user's viewport.

[5]
Offset the cursor by the timer, so it orbits its true position on other clients' screens.
*/
