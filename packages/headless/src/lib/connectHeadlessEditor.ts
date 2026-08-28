import { Editor } from '@tldraw/editor'
import { atom } from '@tldraw/state'
import { TLSyncClient } from '@tldraw/sync-core'
import {
	TLRecord,
	TLStore,
	TLUser,
	TLUserId,
	UserRecordType,
	createPresenceStateDerivation,
} from '@tldraw/tlschema'
import { promiseWithResolve, uniqueId } from '@tldraw/utils'
import { NodeWebSocketAdapter, TLHeadlessClientSocket } from './NodeWebSocketAdapter'

/** @public */
export interface TLHeadlessConnectOptions {
	/**
	 * The sync server uri (http(s) or ws(s)), or a thunk called on each connection attempt.
	 * Useful for short-lived auth tokens. `sessionId` and `storeId` query parameters are
	 * appended automatically.
	 */
	uri?: string | (() => string | Promise<string>)
	/** A pre-built socket to use instead of a `NodeWebSocketAdapter` over `uri`. */
	socket?: TLHeadlessClientSocket
	/** How this client appears to other users in the room. */
	userInfo?: { id?: string; name?: string; color?: string }
	/**
	 * Milliseconds to wait for room hydration before rejecting and closing the connection.
	 * Defaults to 15,000. Pass 0 to wait forever.
	 */
	connectTimeout?: number
	/**
	 * Called when a fatal sync error closes the connection after the connect promise has
	 * settled. Without a handler, a long-lived client's connection can end with no signal to
	 * the caller.
	 */
	onSyncError?(reason: string): void
}

/** @public */
export interface TLHeadlessConnection {
	readonly client: TLSyncClient<TLRecord, TLStore>
	readonly socket: TLHeadlessClientSocket
	/**
	 * Resolves once every local change has been acknowledged by the server, so it is safe to
	 * `close()` or exit. Rejects after `timeoutMs` (default 5,000) or if the connection is
	 * closed.
	 */
	flush(timeoutMs?: number): Promise<void>
	/** Closes the sync client and the socket. Safe to call more than once. */
	close(): void
}

/**
 * Connects a headless editor to a tldraw sync server as a live, named collaborator. The
 * returned promise resolves once the room's document has been loaded into the editor. It
 * rejects, closing the connection, on a fatal sync error or when `connectTimeout` elapses.
 *
 * @example
 * ```ts
 * const connection = await connectHeadlessEditor(editor, {
 *   uri: 'ws://localhost:5858/connect/my-room',
 *   userInfo: { name: 'Agent' },
 * })
 * editor.createShape({ type: 'geo', x: 0, y: 0 })
 * await connection.flush()
 * connection.close()
 * ```
 *
 * @param editor - The editor to connect.
 * @param opts - Options for the connection.
 *
 * @public
 */
export function connectHeadlessEditor(
	editor: Editor,
	opts: TLHeadlessConnectOptions
): Promise<TLHeadlessConnection> {
	if (!opts.uri && !opts.socket) {
		// reject rather than throw so `.catch()` works without a try block around the call
		return Promise.reject(new Error('connectHeadlessEditor: provide either a `uri` or a `socket`'))
	}
	if (editor.isDisposed) {
		return Promise.reject(new Error('connectHeadlessEditor: the editor is disposed'))
	}

	// User creation validates before the socket exists, so a malformed userInfo rejects (like
	// every other argument error here) with nothing to clean up.
	let user
	try {
		// presence records validate userId as a `user:`-prefixed record id
		const rawUserId = opts.userInfo?.id ?? uniqueId()
		user = atom<TLUser | null>(
			'headless sync user',
			UserRecordType.create({
				id: (rawUserId.startsWith('user:') ? rawUserId : `user:${rawUserId}`) as TLUserId,
				name: opts.userInfo?.name ?? 'Agent',
				color: opts.userInfo?.color ?? '#7B66DC',
			})
		)
	} catch (e) {
		return Promise.reject(e)
	}
	const presence = createPresenceStateDerivation(user)(editor.store)

	const sessionId = uniqueId()
	const socket =
		opts.socket ??
		new NodeWebSocketAdapter(async () => {
			const base = typeof opts.uri === 'function' ? await opts.uri() : opts.uri!
			const url = new URL(base)
			url.searchParams.set('sessionId', sessionId)
			url.searchParams.set('storeId', editor.store.id)
			return url.toString()
		})

	let closed = false
	// assigned exactly once, but `close` and `flush` (defined first, so the sync client's
	// callbacks can use them) must tolerate being called before the assignment happens
	// eslint-disable-next-line prefer-const
	let client: TLSyncClient<TLRecord, TLStore> | undefined

	const close = () => {
		if (closed) return
		closed = true
		client?.close()
		socket.close()
		// A close before connecting (editor disposed mid-connect, caller bailing early) must
		// not leave the connect promise hanging. No-op once settled.
		settle(() =>
			promise.reject(
				new Error('connectHeadlessEditor: the connection was closed before connecting')
			)
		)
	}

	const flush = async (timeoutMs = 5000) => {
		const start = Date.now()
		// Local mutations are staged into the sync client on the store's history flush; force one
		// so a flush() immediately after a change doesn't miss work that hasn't been staged yet.
		editor.store._flushHistory()
		while (true) {
			if (closed) throw new Error('flush(): the connection is closed')
			if (!client!.hasPendingChanges()) return
			if (Date.now() - start > timeoutMs) {
				throw new Error(`flush(): changes still pending after ${timeoutMs}ms`)
			}
			await new Promise((resolve) => setTimeout(resolve, 10))
		}
	}

	const promise = promiseWithResolve<TLHeadlessConnection>()
	let settled = false
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	const settle = (fn: () => void) => {
		if (settled) return
		settled = true
		if (timeoutId) clearTimeout(timeoutId)
		fn()
	}

	const connectTimeout = opts.connectTimeout ?? 15_000
	if (connectTimeout > 0) {
		timeoutId = setTimeout(() => {
			settle(() => {
				close()
				promise.reject(
					new Error(`connectHeadlessEditor: could not connect to the server in ${connectTimeout}ms`)
				)
			})
		}, connectTimeout)
	}

	// The editor owns the connection's lifetime: registered before connecting, so a dispose
	// mid-connect closes the socket instead of leaving it reconnecting forever. close() is
	// idempotent, so closing explicitly first is fine.
	editor.disposables.add(close)

	client = new TLSyncClient<TLRecord, TLStore>({
		store: editor.store,
		socket,
		presence,
		// TLSyncClient only pushes ongoing presence when the mode reads 'full'. Without this,
		// cursor/page changes never reach the room.
		presenceMode: atom('headless presence mode', 'full' as const),
		didCancel: () => closed,
		onLoad() {
			settle(() => {
				promise.resolve({ client: client!, socket, flush, close })
			})
		},
		onSyncError(reason) {
			if (settled) {
				close()
				// After the connect promise settles it can no longer reject; without this
				// callback a fatal error would end the connection silently.
				opts.onSyncError?.(reason)
				return
			}
			// Settle with the specific reason before close(), whose own settle would otherwise
			// mask it with the generic closed-before-connecting rejection.
			settle(() => {
				close()
				promise.reject(new Error(`connectHeadlessEditor: sync error: ${reason}`))
			})
		},
		onAfterConnect() {
			// Hydration replaces the local document with the room's, which can leave dangling
			// references in the editor's instance state (e.g. a currentPageId that no longer
			// exists). ensureStoreIsUsable repairs them.
			editor.store.ensureStoreIsUsable()
		},
	})

	return promise
}
