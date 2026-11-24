import { TLPersistentClientSocket, TLSocketRoom, useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Editor,
	inlineBase64AssetStore,
	TLCheckDiff,
	Tldraw,
	TLRecord,
	TLShape,
	uniqueId,
	useEditor,
	useToasts,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './permissions-client-only.css'

function canChange(shape: TLShape, user: string) {
	return shape.meta.owner === undefined || shape.meta.owner === user
}

// [1]
function makeCheckDiff(user: string): TLCheckDiff {
	return (diff) => {
		for (const [from] of Object.values(diff.updated)) {
			if (from.typeName === 'shape' && !canChange(from, user)) {
				return { reason: `This shape belongs to ${from.meta.owner}` }
			}
		}
		for (const record of Object.values(diff.removed)) {
			if (record.typeName === 'shape' && !canChange(record, user)) {
				return { reason: `This shape belongs to ${record.meta.owner}` }
			}
		}
		return null
	}
}

// [2]
function registerChecks(editor: Editor, user: string) {
	editor.sideEffects.registerBeforeCreateHandler('shape', (shape, source) => {
		if (source !== 'user') {
			return shape
		}
		return { ...shape, meta: { ...shape.meta, owner: user } }
	})

	function canChangeSelection() {
		if (!editor.getSelectedShapes().every((shape) => canChange(shape, user))) {
			return { reason: 'You can only change your own shapes' }
		}
		return null
	}
	editor.registerCapabilityCheck('edit-shape', canChangeSelection)
	editor.registerCapabilityCheck('delete-shape', canChangeSelection)
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
	const connect = useCallback(() => connectToRoom(), [])
	const checkDiff = useMemo(() => makeCheckDiff(user), [user])
	const store = useSync({ connect, checkDiff, assets: inlineBase64AssetStore })
	const components = useMemo(() => ({ TopPanel: () => <Status user={user} /> }), [user])
	return (
		<div className="permissions-editor" onPointerDownCapture={() => editor && focusEditor(editor)}>
			<Tldraw
				store={store}
				autoFocus={false}
				onMount={(editor) => {
					setEditor(editor)
					registerChecks(editor, user)
				}}
				components={components}
			/>
		</div>
	)
}

function Status({ user }: { user: string }) {
	const editor = useEditor()
	const { addToast } = useToasts()
	// [3]
	const status = useValue(
		'status',
		() => editor.checkCapability('edit-shape')?.reason ?? 'You can change the selection',
		[editor]
	)

	useEffect(() => {
		function onRejected({ reason }: { reason: string }) {
			addToast({ title: reason, severity: 'warning' })
		}
		editor.on('rejected', onRejected)
		return () => {
			editor.off('rejected', onRejected)
		}
	}, [editor, addToast])

	return (
		<div className="permissions-controls">
			<div className="tlui-menu permissions-user">{user}</div>
			<div className="tlui-menu permissions-status" title={status}>
				{status}
			</div>
		</div>
	)
}

export default function PermissionsClientOnlyExample() {
	return (
		<div className="permissions-editors">
			<UserEditor user="alice" />
			<UserEditor user="bob" />
		</div>
	)
}

// [4]
const room = new TLSocketRoom<TLRecord, void>({})

function connectToRoom(): TLPersistentClientSocket {
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

/*
[1]
The diff check gets every document change of one operation. `from` is the record before the
change, so a user cannot take a shape over by changing its owner. It runs only on this editor's
own changes, not on changes that sync in from the other user. Return nothing to allow.

[2]
A side effect stamps the owner on each shape that this user creates. Side effects also run for
changes that sync in, so check the source. The capability checks read the selection from
the editor: a capability carries no data.

[3]
`checkCapability` is reactive. It returns `null` when allowed, or the rejection.

[4]
The two editors sync through a room that runs in the browser, so that you can see both users at
once. The room has no `checkDiff`, so it stores what each client sends. Your app decides who the
user is; here each editor gets a fixed user.
*/
