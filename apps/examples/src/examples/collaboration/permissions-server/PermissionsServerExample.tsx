import { InMemorySyncStorage, TLPersistentClientSocket, TLSocketRoom, useSync } from '@tldraw/sync'
import { useCallback, useEffect, useState } from 'react'
import {
	Editor,
	IndexKey,
	inlineBase64AssetStore,
	PageRecordType,
	TLRecord,
	Tldraw,
	uniqueId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { checkDiff } from './permissions'
import './permissions-server.css'

// [1]
const storage = new InMemorySyncStorage<TLRecord>()
const samPage = PageRecordType.create({
	id: PageRecordType.createId('sam'),
	name: 'sam',
	index: 'a2' as IndexKey,
})
storage.transaction((txn) => txn.set(samPage.id, samPage))
const room = new TLSocketRoom<TLRecord, void>({ storage, checkDiff })

// [2]
function connectToRoom(userId: string): TLPersistentClientSocket {
	const toServer = new Set<(event: { data: string }) => void>()
	const toClient = new Set<(message: any) => void>()
	const statusListeners = new Set<(event: { status: 'online' | 'offline' }) => void>()

	const client: TLPersistentClientSocket = {
		connectionStatus: 'offline',
		sendMessage(message) {
			const data = JSON.stringify(message)
			setTimeout(() => toServer.forEach((listener) => listener({ data })))
		},
		onReceiveMessage(listener) {
			toClient.add(listener)
			return () => toClient.delete(listener)
		},
		onStatusChange(listener) {
			statusListeners.add(listener)
			return () => statusListeners.delete(listener)
		},
		restart() {},
		close() {
			client.connectionStatus = 'offline'
		},
	}

	room.handleSocketConnect({
		sessionId: uniqueId(),
		userId,
		socket: {
			readyState: 1,
			addEventListener(type, listener) {
				if (type === 'message') {
					toServer.add(listener)
				}
			},
			removeEventListener(type, listener) {
				toServer.delete(listener)
			},
			send(data) {
				setTimeout(() => toClient.forEach((listener) => listener(JSON.parse(data))))
			},
			close() {},
		},
	})

	setTimeout(() => {
		client.connectionStatus = 'online'
		statusListeners.forEach((listener) => listener({ status: 'online' }))
	})
	return client
}

// Two editors on one page: only the one that you click gets keyboard shortcuts.
let focusedEditor: Editor | null = null
function focusEditor(editor: Editor) {
	if (focusedEditor !== editor) {
		focusedEditor?.blur()
		editor.focus()
		focusedEditor = editor
	}
}

function UserEditor({ user }: { user: string }) {
	const [editor, setEditor] = useState<Editor | null>(null)
	// useSync reconnects when connect changes
	const connect = useCallback(() => connectToRoom(user), [user])
	const store = useSync({ connect, assets: inlineBase64AssetStore })
	return (
		<div
			className="permissions-server-column"
			onPointerDownCapture={() => editor && focusEditor(editor)}
		>
			<div className="permissions-status">
				<span className="permissions-user">{user}</span>
				{editor && <Status editor={editor} />}
			</div>
			<div className="permissions-server-editor">
				<Tldraw store={store} autoFocus={false} onMount={setEditor} />
			</div>
		</div>
	)
}

// [3]
function Status({ editor }: { editor: Editor }) {
	const [status, setStatus] = useState('')

	useEffect(() => {
		function onRejected({ reason }: { reason: string }) {
			setStatus(`Rejected: ${reason}`)
		}
		editor.on('rejected', onRejected)
		return () => {
			editor.off('rejected', onRejected)
		}
	}, [editor])

	return <span title={status}>{status}</span>
}

export default function PermissionsServerExample() {
	return (
		<div className="permissions-server">
			<UserEditor user="teacher" />
			<UserEditor user="sam" />
		</div>
	)
}

/*
[1]
The room is the server. Here it runs in the browser so that the example needs no server. In your
app, create it on your server with the same options. `checkDiff` in `permissions.ts` is the same
function as in `templates/simple-server-example`.

[2]
A socket pair in memory, in place of a WebSocket. Your server passes the user it authenticated as
`userId` to `handleSocketConnect`, and `checkDiff` gets it.

[3]
When the room rejects a push, the client reverts it and the editor emits `'rejected'`.
*/
