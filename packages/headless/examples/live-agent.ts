/**
 * A headless agent as a live multiplayer collaborator.
 *
 * This is the flagship use case for `@tldraw/headless`: a Node process joins a sync room as a
 * first-class participant — it appears in the presence list, reads the same document every
 * browser sees, and reacts to other people's edits in real time.
 *
 * The example is fully self-contained: it boots an in-process sync server (a `TLSocketRoom`
 * behind a real WebSocket server, the same wiring `@tldraw/sync` servers use), then connects
 * two headless editors to it over actual sockets:
 *
 * - "human"  — a stand-in for a browser user, who writes sticky notes
 * - "agent"  — responds to every note starting with "todo:" by attaching a checkbox shape
 *              with a bound arrow
 *
 * Patterns to copy:
 * - `store.listen(..., { source: 'remote' })` — the agent only reacts to changes made by
 *   *others*, so its own edits can never re-trigger it.
 * - Catch up, then subscribe: todos that existed before the agent connected are handled by
 *   an initial scan, and idempotency comes from the document itself (does the note already
 *   have an arrow bound to it?), so a restarted agent neither misses old work nor repeats it.
 * - `flush()` — await it after a burst of edits and the changes are durably in the room
 *   before you move on (or exit).
 * - Clean up in `finally` — connections, watchers, and the server close even when an
 *   assertion fails, so a failed run still exits instead of reconnecting forever.
 *
 * Run it: yarn tsx packages/headless/examples/live-agent.ts
 */
import { once } from 'node:events'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TLArrowShape, TLGeoShape, TLNoteShape, TLShape, createShapeId } from '@tldraw/editor'
import { connectHeadlessEditor, createHeadlessEditor } from '@tldraw/headless'
import { TLSocketRoom } from '@tldraw/sync-core'
import { TLRecord, createTLSchema, toRichText } from '@tldraw/tlschema'
import { renderPlaintextFromRichText } from 'tldraw/headless-defaults'
import { WebSocketServer } from 'ws'

async function waitFor(what: string, condition: () => boolean, timeoutMs = 10_000) {
	const start = Date.now()
	while (!condition()) {
		if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${what}`)
		await new Promise((resolve) => setTimeout(resolve, 25))
	}
}

/** The same server shape a production `@tldraw/sync` backend has, in ~15 lines. */
async function startRoomServer() {
	const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema() })
	const wss = new WebSocketServer({ port: 0 })
	wss.on('connection', (ws, req) => {
		const url = new URL(req.url!, 'http://localhost')
		room.handleSocketConnect({
			sessionId: url.searchParams.get('sessionId') ?? crypto.randomUUID(),
			socket: ws,
		})
	})
	try {
		await once(wss, 'listening')
	} catch (e) {
		room.close()
		wss.close()
		throw e
	}
	const address = wss.address()
	if (typeof address === 'string' || address === null) throw new Error('expected a port')
	return {
		room,
		uri: `ws://127.0.0.1:${address.port}`,
		async close() {
			room.close()
			await new Promise<void>((resolve) => wss.close(() => resolve()))
		},
	}
}

export async function run(log: (message: string) => void = console.log) {
	let server: Awaited<ReturnType<typeof startRoomServer>> | undefined
	let agent: ReturnType<typeof createHeadlessEditor> | undefined
	let human: ReturnType<typeof createHeadlessEditor> | undefined
	let agentConnection: Awaited<ReturnType<typeof connectHeadlessEditor>> | undefined
	let humanConnection: Awaited<ReturnType<typeof connectHeadlessEditor>> | undefined
	let stopWatching: (() => void) | undefined

	// The listener below runs from a store-flush timer tick, OUTSIDE this function's stack —
	// a throw there would skip the try/finally entirely and kill the process. Route listener
	// failures into a promise the main flow races against instead.
	let failListener!: (e: unknown) => void
	const listenerFailure = new Promise<never>((_, reject) => (failListener = reject))
	listenerFailure.catch(() => {}) // handled via race; never an unhandled rejection
	const guarded = <T>(work: Promise<T>) => Promise.race([work, listenerFailure])

	try {
		server = await startRoomServer()
		agent = createHeadlessEditor()
		human = createHeadlessEditor()
		const agentEditor = agent

		agentConnection = await connectHeadlessEditor(agent, {
			uri: server.uri,
			userInfo: { name: 'Claude (agent)', color: '#7c3aed' },
			connectTimeout: 5000,
		})
		humanConnection = await connectHeadlessEditor(human, {
			uri: server.uri,
			userInfo: { name: 'Alex' },
			connectTimeout: 5000,
		})
		const agentFlush = agentConnection

		const respondTo = (shape: TLShape) => {
			if (shape.type !== 'note') return
			// Bindings cannot cross pages, so only respond where we can bind: page-level
			// notes on the agent's current page. Anything else would create an orphaned
			// response whose idempotency marker (the binding) can never stick.
			if (shape.parentId !== agentEditor.getCurrentPageId()) return
			const note = shape as TLNoteShape
			const text = renderPlaintextFromRichText(agentEditor, note.props.richText)
			if (!text.toLowerCase().startsWith('todo:')) return
			// Idempotency comes from the document, not from process memory: a note that
			// already has an arrow bound to it has been handled — by this run, a previous
			// run, or another agent. A restarted agent won't create duplicates.
			if (agentEditor.getBindingsToShape(note.id, 'arrow').length > 0) return

			// Respond on the shared canvas: a checkbox pinned to the note by a binding, so it
			// follows if anyone drags the note later. Note coordinates on a record are
			// parent-space; page bounds are the safe way to place a sibling next to it.
			const noteBounds = agentEditor.getShapePageBounds(note.id)
			if (!noteBounds) return
			const checkboxId = createShapeId()
			const arrowId = createShapeId()
			agentEditor.run(() => {
				agentEditor.createShape<TLGeoShape>({
					id: checkboxId,
					type: 'geo',
					x: noteBounds.x - 160,
					y: noteBounds.y,
					props: { geo: 'check-box', w: 56, h: 56, color: 'green' },
				})
				agentEditor.createShape<TLArrowShape>({ id: arrowId, type: 'arrow', x: 0, y: 0 })
				agentEditor.createBindings([
					{ type: 'arrow', fromId: arrowId, toId: checkboxId, props: { terminal: 'start' } },
					{ type: 'arrow', fromId: arrowId, toId: note.id, props: { terminal: 'end' } },
				])
			})
			log(`agent: tracked "${text}"`)
			// Fire-and-forget is fine mid-session (flush is just a drain-wait; concurrent
			// calls are harmless) — the final flush below is the delivery guarantee before
			// shutdown. Log failures instead of swallowing them.
			agentFlush.flush().catch((e) => log(`agent: flush failed: ${e}`))
		}
		const maybeRespond = (shape: TLShape) => {
			try {
				respondTo(shape)
			} catch (e) {
				failListener(e)
			}
		}

		// Catch up on todos that existed before this agent connected, then subscribe for new
		// ones. `source: 'remote'` means the listener fires only for changes that arrived
		// over the socket, never for the agent's own edits — no self-trigger loops.
		for (const shape of agent.getCurrentPageShapes()) maybeRespond(shape)
		stopWatching = agent.store.listen(
			({ changes }) => {
				const incoming = [
					...Object.values(changes.added),
					...Object.values(changes.updated).map(([, next]) => next),
				]
				for (const record of incoming) {
					if (record.typeName === 'shape') maybeRespond(record as TLShape)
				}
			},
			{ source: 'remote', scope: 'document' }
		)

		// The "human" writes three notes — two of them todos — exactly as a browser user would.
		const notes = [
			{ text: 'todo: write the launch post', x: 0, y: 0 },
			{ text: 'meeting moved to Thursday', x: 0, y: 260 },
			{ text: 'TODO: fix the flaky export test', x: 0, y: 520 },
		]
		for (const { text, x, y } of notes) {
			human.createShape<TLNoteShape>({
				id: createShapeId(),
				type: 'note',
				x,
				y,
				props: { richText: toRichText(text) },
			})
		}
		await guarded(humanConnection.flush())
		log('human: posted 3 notes (2 todos)')

		// Convergence check from the human's side of the room: the agent's responses arrive
		// through sync like any collaborator's edits. Each wait races the listener-failure
		// promise so an agent-side crash fails the run instead of hanging it.
		const humanEditor = human
		await guarded(
			waitFor(
				"the agent's responses to reach the human's editor",
				() =>
					humanEditor.getCurrentPageShapes().filter((s) => s.type === 'geo').length === 2 &&
					humanEditor.getCurrentPageShapes().filter((s) => s.type === 'arrow').length === 2
			)
		)
		const seenByHuman = human.getCurrentPageShapes()
		log(
			`human: sees ${seenByHuman.length} shapes (${seenByHuman.filter((s) => s.type === 'note').length} notes, ` +
				`${seenByHuman.filter((s) => s.type === 'geo').length} checkboxes, ` +
				`${seenByHuman.filter((s) => s.type === 'arrow').length} arrows)`
		)

		// Presence: the agent is a named collaborator, not an invisible mutation source.
		await guarded(
			waitFor('presence to propagate', () =>
				humanEditor.getCollaborators().some((c) => c.userName === 'Claude (agent)')
			)
		)
		log(
			`human: collaborators = ${human
				.getCollaborators()
				.map((c) => c.userName)
				.join(', ')}`
		)

		await guarded(agentConnection.flush())
		return seenByHuman.length
	} finally {
		// Everything closes even when a step above throws — otherwise the sync clients
		// keep reconnecting forever and the process (or test worker) never settles.
		stopWatching?.()
		agentConnection?.close()
		humanConnection?.close()
		agent?.dispose()
		human?.dispose()
		await server?.close()
	}
}

const isMain = (() => {
	if (!process.argv[1]) return false
	try {
		return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
	} catch {
		return false
	}
})()
if (isMain) {
	run().catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
