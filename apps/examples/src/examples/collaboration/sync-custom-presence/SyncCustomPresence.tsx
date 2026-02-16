import { useSyncDemo } from '@tldraw/sync'
import { useEffect } from 'react'
import { Tldraw, getDefaultUserPresence, useAtom } from 'tldraw'
import 'tldraw/tldraw.css'

export default function SyncCustomUserExample({ roomId }: { roomId: string }) {
	// [1]
	const timer = useAtom('timer', Date.now())
	useEffect(() => {
		const tick = () => {
			timer.set(Date.now())
			frame = requestAnimationFrame(tick)
		}
		let frame = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frame)
	}, [timer])

	// [2]
	const store = useSyncDemo({
		roomId,
		getUserPresence(store, user) {
			// [2.1]
			const defaults = getDefaultUserPresence(store, user)
			if (!defaults) return null

			return {
				...defaults,

				// [2.2]
				camera: undefined,

				// [2.3]
				cursor: {
					...defaults.cursor,
					x: (defaults.cursor.x ?? 0) + 20 * Math.sin(timer.get() / 200),
					y: (defaults.cursor.y ?? 0) + 20 * Math.cos(timer.get() / 200),
				},
			}
		},
	})

	// [3]
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} deepLinks />
		</div>
	)
}

/**
 * # Sync Custom User
 *
 * This example demonstrates how to use the sync demo server with custom presence state. The
 * presence state is synchronized to all other clients and used for multiplayer features like
 * cursors and viewport following. You can use custom presence state to change the data that's
 * synced to other clients, or remove parts you don't need for your app.
 *
 * 1. We create a timer that updates every frame. You don't need to do this in your app, it's just
 *    to power an animation. We store it in an `atom` so that changes to it will cause the presence
 *    info to update.
 *
 * 2. We create a multiplayer store using the userSyncDemo hook, and pass in a custom
 *    `getUserPresence` function to change the presence state that gets sent.
 *
 * 2.1. We get the default presence state using the `getDefaultUserPresence` function. If you wanted
 *    to send a very minimal set of presence data, you could avoid this part.
 *
 * 2.2. We remove the camera from the presence state. This means that the camera position won't be
 *    sent to other clients. Attempting to follow this users viewport will not work.
 *
 * 2.3. We update the cursor position and rotation based on the current time. This will make the
 *    cursor spin around in a circle.
 *
 * 3. We create a Tldraw component and pass in the multiplayer store. This will render the editor.
 */
