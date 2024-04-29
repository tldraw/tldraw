/* eslint-disable no-inner-declarations */
import { useRef } from 'react'
import { InstancePresenceRecordType, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const USER_NAME = 'huppy da arrow'
const MOVING_CURSOR_SPEED = 0.25 // 0 is stopped, 1 is full send
const MOVING_CURSOR_RADIUS = 100
const CURSOR_CHAT_MESSAGE = 'Hey, I think this is just great.'

// [2]
export default function UserPresenceExample() {
	const rRaf = useRef<any>(-1)
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="user-presence-example"
				onMount={(editor) => {
					// [a]
					const peerPresence = InstancePresenceRecordType.create({
						id: InstancePresenceRecordType.createId(editor.store.id),
						currentPageId: editor.getCurrentPageId(),
						userId: 'peer-1',
						userName: USER_NAME,
						cursor: { x: 0, y: 0, type: 'default', rotation: 0 },
						chatMessage: CURSOR_CHAT_MESSAGE,
					})

					editor.store.mergeRemoteChanges(() => {
						editor.store.put([peerPresence])
					})

					// [b]
					const raf = rRaf.current
					cancelAnimationFrame(raf)

					if (MOVING_CURSOR_SPEED > 0 || CURSOR_CHAT_MESSAGE) {
						function loop() {
							let cursor = peerPresence.cursor
							let chatMessage = peerPresence.chatMessage

							const now = Date.now()

							if (MOVING_CURSOR_SPEED > 0) {
								const k = 1000 / MOVING_CURSOR_SPEED
								const t = (now % k) / k

								cursor = {
									...peerPresence.cursor,
									x: 150 + Math.cos(t * Math.PI * 2) * MOVING_CURSOR_RADIUS,
									y: 150 + Math.sin(t * Math.PI * 2) * MOVING_CURSOR_RADIUS,
								}
							}

							if (CURSOR_CHAT_MESSAGE) {
								const k = 1000
								const t = (now % (k * 3)) / k
								chatMessage =
									t < 1
										? ''
										: t > 2
											? CURSOR_CHAT_MESSAGE
											: CURSOR_CHAT_MESSAGE.slice(
													0,
													Math.ceil((t - 1) * CURSOR_CHAT_MESSAGE.length)
												)
							}

							editor.store.mergeRemoteChanges(() => {
								editor.store.put([
									{
										...peerPresence,
										cursor,
										chatMessage,
										lastActivityTimestamp: now,
									},
								])
							})

							rRaf.current = requestAnimationFrame(loop)
						}

						rRaf.current = requestAnimationFrame(loop)
					} else {
						editor.store.mergeRemoteChanges(() => {
							editor.store.put([{ ...peerPresence, lastActivityTimestamp: Date.now() }])
						})
						rRaf.current = setInterval(() => {
							editor.store.mergeRemoteChanges(() => {
								editor.store.put([{ ...peerPresence, lastActivityTimestamp: Date.now() }])
							})
						}, 1000)
					}
				}}
			/>
		</div>
	)
}

/* 
This example shows how to add instance presence records to the store to show other users' cursors.
It is not an example of how to implement user presence, check out the yjs example for that:
https://github.com/tldraw/tldraw-yjs-example

[1]
We're going to a fake a user's cursor and chat message, these are the values we'll use.

[2]
This is where we'll render the Tldraw component. We'll use the onMount callback to access the editor 
instance.
	[a] For every connected peer we need to add an instance presence record to the store. We can do
		this using the InstancePresenceRecordType.create function and add it to the store using the
		store.put method.
	[b] We'll use the requestAnimationFrame function to update the cursor position and chat message.
		This is just for demonstration purposes.
*/
