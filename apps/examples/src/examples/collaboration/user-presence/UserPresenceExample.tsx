import { createUserId, Editor, InstancePresenceRecordType, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const USER_NAME = 'huppy da arrow'
const MOVING_CURSOR_SPEED = 0.25 // 0 is stopped, 1 is full send
const MOVING_CURSOR_RADIUS = 100
const CURSOR_CHAT_MESSAGE = 'Hey, I think this is just great.'

function handleMount(editor: Editor) {
	// [2]
	const peerPresence = InstancePresenceRecordType.create({
		id: InstancePresenceRecordType.createId(editor.store.id),
		currentPageId: editor.getCurrentPageId(),
		userId: createUserId('peer-1'),
		userName: USER_NAME,
		cursor: { x: 0, y: 0, type: 'default', rotation: 0 },
		chatMessage: CURSOR_CHAT_MESSAGE,
	})

	editor.store.mergeRemoteChanges(() => {
		editor.store.put([peerPresence])
	})

	// [3]
	function loop() {
		let cursor = peerPresence.cursor
		if (!cursor) return
		let chatMessage = peerPresence.chatMessage

		const now = Date.now()

		if (MOVING_CURSOR_SPEED > 0) {
			const k = 1000 / MOVING_CURSOR_SPEED
			const t = (now % k) / k

			cursor = {
				...cursor,
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
						: CURSOR_CHAT_MESSAGE.slice(0, Math.ceil((t - 1) * CURSOR_CHAT_MESSAGE.length))
		}

		editor.store.mergeRemoteChanges(() => {
			editor.store.put([{ ...peerPresence, cursor, chatMessage, lastActivityTimestamp: now }])
		})

		editor.timers.requestAnimationFrame(loop)
	}

	editor.timers.requestAnimationFrame(loop)
}

export default function UserPresenceExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="user-presence-example" onMount={handleMount} />
		</div>
	)
}

/*
Other users' cursors, names, and chat bubbles are driven by `instance_presence` records in the
store. This example puts a fake one in by hand. It is not a multiplayer implementation; see the sync
examples for that. If you have your own presence transport, you can write real records the same way.

[1]
The fake peer's name, cursor path, and chat message.

[2]
One `instance_presence` record per connected peer, created with `InstancePresenceRecordType.create`.
Writing it inside `store.mergeRemoteChanges` marks the change as coming from a remote source, so it
doesn't land on the undo stack or get treated as a local edit.

[3]
Move the cursor in a circle and type out the chat message, updating the record every frame.
`lastActivityTimestamp` is what keeps the cursor visible: the editor hides collaborators who go
quiet. `editor.timers.requestAnimationFrame` is cancelled automatically when the editor is disposed,
so there's nothing to clean up.
*/
