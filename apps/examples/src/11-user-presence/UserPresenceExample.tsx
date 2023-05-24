import {
	InstancePageStateRecordType,
	InstanceRecordType,
	Tldraw,
	UserPresenceRecordType,
	UserRecordType,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useRef } from 'react'

const SHOW_MOVING_CURSOR = false
const CURSOR_SPEED = 0.1
const CIRCLE_RADIUS = 100
const UPDATE_FPS = 60

export default function UserPresenceExample() {
	const rTimeout = useRef<any>(-1)
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="user-presence-example"
				onMount={(app) => {
					// There are several records related to user presence that must be
					// included for each user. These are created automatically by each
					// editor or editor instance, so in a "regular" multiplayer sharing
					// all records will include all of these records. In this example,
					// we're having to create these ourselves.

					const userId = UserRecordType.createCustomId('user-1')

					const user = UserRecordType.create({
						id: userId,
						name: 'User 1',
					})

					const userPresence = UserPresenceRecordType.create({
						...app.userPresence,
						id: UserPresenceRecordType.createCustomId('user-1'),
						cursor: { x: 0, y: 0 },
						userId,
					})

					const instance = InstanceRecordType.create({
						...app.instanceState,
						id: InstanceRecordType.createCustomId('user-1'),
						userId,
					})

					const instancePageState = InstancePageStateRecordType.create({
						...app.pageState,
						id: InstancePageStateRecordType.createCustomId('user-1'),
						instanceId: InstanceRecordType.createCustomId('instance-1'),
					})

					app.store.put([user, instance, userPresence, instancePageState])

					// Make the fake user's cursor rotate in a circle
					if (rTimeout.current) {
						clearTimeout(rTimeout.current)
					}

					if (SHOW_MOVING_CURSOR) {
						rTimeout.current = setInterval(() => {
							const k = 1000 / CURSOR_SPEED
							const now = Date.now()
							const t = (now % k) / k
							// rotate in a circle
							app.store.put([
								{
									...userPresence,
									cursor: {
										x: Math.cos(t * Math.PI * 2) * CIRCLE_RADIUS,
										y: Math.sin(t * Math.PI * 2) * CIRCLE_RADIUS,
									},
									lastActivityTimestamp: now,
								},
							])
						}, 1000 / UPDATE_FPS)
					} else {
						app.store.put([
							{ ...userPresence, cursor: { x: 0, y: 0 }, lastActivityTimestamp: Date.now() },
						])

						rTimeout.current = setInterval(() => {
							app.store.put([
								{ ...userPresence, cursor: { x: 0, y: 0 }, lastActivityTimestamp: Date.now() },
							])
						}, 1000)
					}
				}}
			/>
		</div>
	)
}
