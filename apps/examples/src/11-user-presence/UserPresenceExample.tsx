import { Tldraw, TLInstance, TLInstancePageState, TLUser, TLUserPresence } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useRef } from 'react'

export default function UserPresenceExample() {
	const rTimeout = useRef<any>(-1)
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(app) => {
					// There are several records related to user presence that must be
					// included for each user. These are created automatically by each
					// editor or editor instance, so in a "regular" multiplayer sharing
					// all records will include all of these records. In this example,
					// we're having to create these ourselves.

					const userId = TLUser.createCustomId('user-1')
					const user = TLUser.create({
						id: userId,
						name: 'User 1',
					})

					const userPresence = TLUserPresence.create({
						...app.userPresence,
						id: TLUserPresence.createCustomId('user-1'),
						cursor: { x: 0, y: 0 },
						userId,
					})

					const instance = TLInstance.create({
						...app.instanceState,
						id: TLInstance.createCustomId('user-1'),
						userId,
					})

					const instancePageState = TLInstancePageState.create({
						...app.pageState,
						id: TLInstancePageState.createCustomId('user-1'),
						instanceId: TLInstance.createCustomId('instance-1'),
					})

					app.store.put([user, instance, userPresence, instancePageState])

					// Make the fake user's cursor rotate in a circle
					if (rTimeout.current) {
						clearTimeout(rTimeout.current)
					}

					rTimeout.current = setInterval(() => {
						const SPEED = 0.1
						const R = 400
						const k = 1000 / SPEED
						const t = (Date.now() % k) / k
						// rotate in a circle
						const x = Math.cos(t * Math.PI * 2) * R
						const y = Math.sin(t * Math.PI * 2) * R
						app.store.put([
							{
								...userPresence,
								cursor: { x, y },
								lastActivityTimestamp: Date.now(),
							},
						])
					}, 16)
				}}
			/>
		</div>
	)
}
