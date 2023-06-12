import { InstancePresenceRecordType, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useRef } from 'react'

const SHOW_MOVING_CURSOR = true
const CURSOR_SPEED = 0.5
const CIRCLE_RADIUS = 100
const UPDATE_FPS = 60

export default function UserPresenceExample() {
	const rTimeout = useRef<any>(-1)
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="user-presence-example"
				onMount={(editor) => {
					// For every connected peer you should put a TLInstancePresence record in the
					// store with their cursor position etc.

					const peerPresence = InstancePresenceRecordType.create({
						id: InstancePresenceRecordType.createId(editor.store.id),
						currentPageId: editor.currentPageId,
						userId: 'peer-1',
						userName: 'Peer 1',
						cursor: { x: 0, y: 0, type: 'default', rotation: 0 },
					})

					editor.store.put([peerPresence])

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
							editor.store.put([
								{
									...peerPresence,
									cursor: {
										...peerPresence.cursor,
										x: 150 + Math.cos(t * Math.PI * 2) * CIRCLE_RADIUS,
										y: 150 + Math.sin(t * Math.PI * 2) * CIRCLE_RADIUS,
									},
									lastActivityTimestamp: now,
								},
							])
						}, 1000 / UPDATE_FPS)
					} else {
						editor.store.put([{ ...peerPresence, lastActivityTimestamp: Date.now() }])

						rTimeout.current = setInterval(() => {
							editor.store.put([{ ...peerPresence, lastActivityTimestamp: Date.now() }])
						}, 1000)
					}
				}}
			/>
		</div>
	)
}
