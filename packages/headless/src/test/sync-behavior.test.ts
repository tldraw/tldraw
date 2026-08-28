import { once } from 'node:events'
import { TLGeoShape, TLShapeId, createShapeId } from '@tldraw/editor'
import { TLSocketRoom } from '@tldraw/sync-core'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { uniqueId } from '@tldraw/utils'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import { TLHeadlessConnectOptions, connectHeadlessEditor } from '../lib/connectHeadlessEditor'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'
import { NodeWebSocketAdapter } from '../lib/NodeWebSocketAdapter'

async function waitFor(what: string, condition: () => boolean, timeoutMs = 10_000) {
	const start = Date.now()
	while (!condition()) {
		if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${what}`)
		await new Promise((resolve) => setTimeout(resolve, 10))
	}
}

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
	// reverse order so connections close before the room and websocket server they depend on
	for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function startServer() {
	const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema() })
	const wss = new WebSocketServer({ port: 0 })
	wss.on('connection', (ws, req) => {
		const url = new URL(req.url!, 'http://localhost')
		room.handleSocketConnect({
			sessionId: url.searchParams.get('sessionId') ?? uniqueId(),
			socket: ws,
		})
	})
	await once(wss, 'listening')
	const address = wss.address()
	if (typeof address === 'string' || address === null) throw new Error('expected a port')
	cleanups.push(async () => {
		room.close()
		await new Promise<void>((resolve) => wss.close(() => resolve()))
	})
	return { room, uri: `ws://127.0.0.1:${address.port}` }
}

async function connect(uri: string, opts: Omit<TLHeadlessConnectOptions, 'uri'> = {}) {
	const editor = createHeadlessEditor()
	cleanups.push(() => editor.dispose())
	const connection = await connectHeadlessEditor(editor, { uri, connectTimeout: 10_000, ...opts })
	cleanups.push(() => connection.close())
	return { editor, connection }
}

function serverShapeCount(room: TLSocketRoom<TLRecord, void>) {
	return room.storage.getSnapshot!().documents.filter((d) => d.state.typeName === 'shape').length
}

describe('convergence', () => {
	it('three clients creating shapes concurrently converge to identical documents', async () => {
		const { room, uri } = await startServer()
		const clients = await Promise.all([connect(uri), connect(uri), connect(uri)])

		for (let i = 0; i < clients.length; i++) {
			for (let j = 0; j < 5; j++) {
				clients[i].editor.createShape<TLGeoShape>({
					id: createShapeId(),
					type: 'geo',
					x: i * 1000 + j * 100,
					y: i * 10,
					props: { w: 50 + j, h: 50 },
				})
			}
		}
		await Promise.all(clients.map((c) => c.connection.flush()))
		await waitFor(
			'all clients to see all 15 shapes',
			() => clients.every((c) => c.editor.getCurrentPageShapes().length === 15),
			15_000
		)

		// whole-document equality, not just counts: every record (shapes, page, document) matches
		const docs = clients.map((c) => c.editor.store.serialize('document'))
		expect(docs[1]).toEqual(docs[0])
		expect(docs[2]).toEqual(docs[0])
		expect(serverShapeCount(room)).toBe(15)
	}, 20_000)

	it('concurrent updates to the same shape: the later local write wins everywhere', async () => {
		const { room, uri } = await startServer()
		const a = await connect(uri)
		const b = await connect(uri)

		const id = createShapeId()
		a.editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } })
		await a.connection.flush()
		await waitFor('b to see the shape', () => !!b.editor.getShape(id))

		// Make the server arrival order explicit — flush a's write before b writes. With truly
		// simultaneous pushes over two sockets the arrival order (and so the winner) is up to
		// the network; the invariant is per-property last-arrival-wins plus convergence.
		a.editor.updateShape<TLGeoShape>({ id, type: 'geo', x: 111 })
		await a.connection.flush()
		b.editor.updateShape<TLGeoShape>({ id, type: 'geo', x: 222 })
		await b.connection.flush()

		await waitFor(
			'both clients to agree on x',
			() => a.editor.getShape<TLGeoShape>(id)!.x === b.editor.getShape<TLGeoShape>(id)!.x,
			15_000
		)
		// Pinned actual behavior: the write that reaches the server second wins — on the server
		// and, after rebase, on the client whose write it overwrote.
		expect(a.editor.getShape<TLGeoShape>(id)!.x).toBe(222)
		const serverDoc = room.storage.getSnapshot!().documents.find((d) => d.state.id === id)
		expect(serverDoc!.state).toMatchObject({ x: 222 })
	}, 20_000)

	it('a late joiner hydrates the existing document, then contributes and converges', async () => {
		const { room, uri } = await startServer()
		const a = await connect(uri)
		const existing: TLShapeId[] = []
		for (let i = 0; i < 3; i++) {
			const id = createShapeId()
			existing.push(id)
			a.editor.createShape<TLGeoShape>({ id, type: 'geo', x: i * 100, y: 0 })
		}
		await a.connection.flush()

		const late = await connect(uri)
		// hydration is complete when connectHeadlessEditor resolves — no extra waiting needed
		expect(
			late.editor
				.getCurrentPageShapes()
				.map((s) => s.id)
				.sort()
		).toEqual([...existing].sort())

		const contribution = createShapeId()
		late.editor.createShape<TLGeoShape>({ id: contribution, type: 'geo', x: 999, y: 999 })
		await late.connection.flush()
		await waitFor('a to see the late joiner contribution', () => !!a.editor.getShape(contribution))
		expect(a.editor.store.serialize('document')).toEqual(late.editor.store.serialize('document'))
		expect(serverShapeCount(room)).toBe(4)
	}, 20_000)

	it('delete racing an edit: the delete wins and the edit is discarded', async () => {
		const { room, uri } = await startServer()
		const a = await connect(uri)
		const b = await connect(uri)

		const id = createShapeId()
		a.editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
		await a.connection.flush()
		await waitFor('b to see the shape', () => !!b.editor.getShape(id))

		a.editor.deleteShape(id)
		b.editor.updateShape<TLGeoShape>({ id, type: 'geo', x: 999 })
		await Promise.all([a.connection.flush(), b.connection.flush()])

		// Pinned actual behavior: whichever order the pushes land in, the shape ends up deleted
		// on the server and on both clients — a patch to a deleted record does not resurrect it,
		// and b's local edit is rolled back by the rebase.
		await waitFor(
			'the shape to be gone everywhere',
			() =>
				!a.editor.getShape(id) &&
				!b.editor.getShape(id) &&
				!room.storage.getSnapshot!().documents.some((d) => d.state.id === id),
			15_000
		)
	}, 20_000)
})

describe('presence', () => {
	it('clients see each other as named, colored collaborators', async () => {
		const { uri } = await startServer()
		const a = await connect(uri, { userInfo: { name: 'Alice', color: '#ff0000' } })
		const b = await connect(uri, { userInfo: { name: 'Bob', color: '#00ff00' } })
		const c = await connect(uri, { userInfo: { name: 'Carol', color: '#0000ff' } })

		await waitFor(
			'everyone to see the other two',
			() =>
				[a, b, c].every((client) => client.editor.getCollaborators().length === 2) &&
				a.editor
					.getCollaborators()
					.map((p) => p.userName)
					.sort()
					.join(',') === 'Bob,Carol',
			15_000
		)

		// userInfo round-trips: the color a client sets is the color the others see
		const bob = a.editor.getCollaborators().find((p) => p.userName === 'Bob')!
		expect(bob.color).toBe('#00ff00')
		const alice = b.editor.getCollaborators().find((p) => p.userName === 'Alice')!
		expect(alice.color).toBe('#ff0000')
	}, 20_000)

	it("a closed connection's presence disappears from others after the server grace period", async () => {
		const { uri } = await startServer()
		const a = await connect(uri, { userInfo: { name: 'Watcher' } })
		const b = await connect(uri, { userInfo: { name: 'Leaver' } })

		await waitFor(
			'a to see the leaver',
			() => a.editor.getCollaborators().some((p) => p.userName === 'Leaver'),
			15_000
		)

		const closedAt = Date.now()
		b.connection.close()
		await waitFor(
			"the leaver's presence to disappear",
			() => !a.editor.getCollaborators().some((p) => p.userName === 'Leaver'),
			15_000
		)
		// Pinned actual behavior: removal is not immediate. The room keeps a closed session in an
		// awaiting-removal state for SESSION_REMOVAL_WAIT_TIME (5s) so quick reconnects keep their
		// presence, and only prunes (and broadcasts the presence delete) after that grace period.
		// The window is pinned on both sides: shrinking the grace or making clean-close removal
		// immediate is a product change this test should surface, not a flake.
		expect(Date.now() - closedAt).toBeGreaterThan(4000)
		expect(Date.now() - closedAt).toBeLessThan(12_000)
	}, 25_000)

	it('presence updates propagate live: cursor and page changes reach other clients', async () => {
		// connectHeadlessEditor passes presenceMode 'full' — without it, TLSyncClient's ongoing
		// presence push is disarmed and presence would be a one-shot snapshot at connect.
		const { uri } = await startServer()
		const a = await connect(uri, { userInfo: { name: 'Alice' } })
		const b = await connect(uri, { userInfo: { name: 'Bob' } })

		const aliceSeenByB = () => b.editor.getCollaborators().find((p) => p.userName === 'Alice')
		await waitFor('b to see alice', () => !!aliceSeenByB(), 15_000)
		const page1 = b.editor.getCurrentPageId()
		// both clients hydrate the same room document, so they share the same default page and
		// alice starts out as one of b's current-page collaborators
		expect(a.editor.getCurrentPageId()).toBe(page1)
		expect(b.editor.getCollaboratorsOnCurrentPage().some((p) => p.userName === 'Alice')).toBe(true)
		expect(aliceSeenByB()!.cursor?.type).toBe('default')

		a.editor.updateInstanceState({ cursor: { type: 'cross', rotation: 0 } })
		a.editor.createPage({ name: 'page 2' })
		const page2 = a.editor.getPages()[1].id
		a.editor.setCurrentPage(page2)
		await a.connection.flush()
		await waitFor('b to see page 2 in the document', () => !!b.editor.getPage(page2), 15_000)

		// alice's live presence reaches b: new cursor, new page
		await waitFor(
			"alice's presence update to reach b",
			() => aliceSeenByB()?.currentPageId === page2 && aliceSeenByB()?.cursor?.type === 'cross',
			15_000
		)

		// getCollaboratorsOnCurrentPage filters by the LOCAL current page against each peer's
		// presence page: alice (now on page 2) is out of b's page-1 list, and joins it once
		// b moves to page 2 as well
		expect(b.editor.getCollaborators().some((p) => p.userName === 'Alice')).toBe(true)
		expect(b.editor.getCollaboratorsOnCurrentPage().some((p) => p.userName === 'Alice')).toBe(false)
		b.editor.setCurrentPage(page2)
		expect(b.editor.getCollaboratorsOnCurrentPage().some((p) => p.userName === 'Alice')).toBe(true)
	}, 25_000)
})

describe('flush', () => {
	it('resolves only after a burst of 100 creates is fully in server storage', async () => {
		const { room, uri } = await startServer()
		const { editor, connection } = await connect(uri)

		for (let i = 0; i < 100; i++) {
			editor.createShape<TLGeoShape>({
				id: createShapeId(),
				type: 'geo',
				x: (i % 10) * 60,
				y: Math.floor(i / 10) * 60,
				props: { w: 50, h: 50 },
			})
		}
		await connection.flush()
		// no waitFor here on purpose: flush's contract is that the work is durable when it resolves
		expect(serverShapeCount(room)).toBe(100)
	}, 20_000)

	it('resolves fast when nothing is pending', async () => {
		const { uri } = await startServer()
		const { connection } = await connect(uri)
		const start = Date.now()
		await connection.flush()
		expect(Date.now() - start).toBeLessThan(500)
	}, 15_000)
})

describe('reconnect', () => {
	it('a fatal server rejection after connect reaches the onSyncError callback', async () => {
		const { room, uri } = await startServer()
		let syncError: string | undefined
		await connect(uri, { onSyncError: (reason) => (syncError = reason) })
		const sessionId = room.getSessions()[0].sessionId

		// A fatal close (e.g. permission revoked) is not retryable; before the callback
		// existed, a connected client's connection ended with no signal to the caller.
		room.closeSession(sessionId, 'PERMISSION_DENIED')
		await waitFor('the sync error to reach the callback', () => syncError !== undefined, 15_000)
		expect(syncError).toBe('PERMISSION_DENIED')
	}, 20_000)

	it('reconnects after a server-side session close and re-converges both ways', async () => {
		const { room, uri } = await startServer()
		const a = await connect(uri)
		const sessionIdA = room.getSessions()[0].sessionId
		const b = await connect(uri)

		const s1 = createShapeId()
		a.editor.createShape<TLGeoShape>({ id: s1, type: 'geo', x: 0, y: 0 })
		await a.connection.flush()
		await waitFor('b to see s1', () => !!b.editor.getShape(s1))

		// a non-fatal server-side kick: the adapter must treat it like any dropped connection
		room.closeSession(sessionIdA)
		await waitFor(
			'a to notice it is offline',
			() => a.connection.socket.connectionStatus !== 'online',
			10_000
		)

		// while a is down, b keeps editing and a stages a speculative local change
		const s2 = createShapeId()
		b.editor.createShape<TLGeoShape>({ id: s2, type: 'geo', x: 100, y: 0 })
		await b.connection.flush()
		const s3 = createShapeId()
		a.editor.createShape<TLGeoShape>({ id: s3, type: 'geo', x: 200, y: 0 })

		// NodeWebSocketAdapter reconnects on its own (500ms initial backoff), re-hydrates, and
		// pushes the speculative change — both editors and the server end up with all three shapes
		await waitFor(
			'both clients and the server to hold all three shapes',
			() =>
				[s1, s2, s3].every((id) => a.editor.getShape(id) && b.editor.getShape(id)) &&
				serverShapeCount(room) === 3,
			15_000
		)
		expect(a.editor.store.serialize('document')).toEqual(b.editor.store.serialize('document'))
	}, 25_000)

	it('a flush in flight when the server kills the session still completes durably', async () => {
		const { room, uri } = await startServer()
		const { editor, connection } = await connect(uri)
		const sessionId = room.getSessions()[0].sessionId

		const ids: TLShapeId[] = []
		for (let i = 0; i < 20; i++) {
			const id = createShapeId()
			ids.push(id)
			editor.createShape<TLGeoShape>({
				id,
				type: 'geo',
				x: (i % 5) * 60,
				y: Math.floor(i / 5) * 60,
			})
		}
		// start the flush but don't await it — then kill the session under it
		const flushPromise = connection.flush(20_000)
		room.closeSession(sessionId)

		// Pinned actual behavior: the flush RESOLVES rather than rejecting. flush() polls
		// hasPendingChanges, and a non-fatal server-side close doesn't drop the speculative local
		// changes — the adapter reconnects on its own (500ms initial backoff), re-pushes them, and
		// the pending set drains within the timeout. Only if reconnection took longer than the
		// flush timeout would callers see the pending-changes rejection.
		await expect(flushPromise).resolves.toBeUndefined()

		// either way the contract that matters: the server converges to every shape
		await waitFor('the server to hold all 20 shapes', () => serverShapeCount(room) === 20, 15_000)
		const serverIds = room.storage.getSnapshot!()
			.documents.filter((d) => d.state.typeName === 'shape')
			.map((d) => d.state.id)
		expect(serverIds.sort()).toEqual([...ids].sort())
	}, 30_000)
})

describe('custom socket', () => {
	it('syncs through a caller-supplied socket adapter via the socket option', async () => {
		const { room, uri } = await startServer()

		const editor = createHeadlessEditor()
		cleanups.push(() => editor.dispose())
		// when a socket is supplied, connectHeadlessEditor appends no query params — the caller
		// owns the uri, including the sessionId the server keys the session by
		const socket = new NodeWebSocketAdapter(() => {
			const url = new URL(uri)
			url.searchParams.set('sessionId', 'custom-socket-session')
			url.searchParams.set('storeId', editor.store.id)
			return url.toString()
		})
		const connection = await connectHeadlessEditor(editor, { socket, connectTimeout: 10_000 })
		cleanups.push(() => connection.close())

		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 3, y: 4, props: { w: 20, h: 30 } })
		await connection.flush()

		const doc = room.storage.getSnapshot!().documents.find((d) => d.state.id === id)
		expect(doc!.state).toMatchObject({ x: 3, y: 4 })
		expect(room.getSessions().some((s) => s.sessionId === 'custom-socket-session')).toBe(true)
	}, 15_000)
})
