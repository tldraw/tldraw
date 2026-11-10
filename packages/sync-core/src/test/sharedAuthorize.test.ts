import { atom, computed } from '@tldraw/state'
import {
	createShapeId,
	PageRecordType,
	TLFrameShape,
	TLRecord,
	TLRefusal,
	TLShapeId,
} from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import {
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLEditorOptions,
} from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncRefusal } from '../lib/protocol'
import { TLSyncClient } from '../lib/TLSyncClient'
import { perRecord, TLSessionAccess, TLSyncAuthorizer } from '../lib/TLSyncRoom'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface Meta {
	userId: string
	role: 'teacher' | 'student'
}

const schema = createTLSchema()

// The one rule: a student writes only shapes they own, and can't hand one over or take one.
const rule: TLSyncAuthorizer<TLRecord, Meta> = perRecord(({ record, prev }, { session }) => {
	if (session.meta.role === 'teacher') return null
	if (record.typeName !== 'shape') return null
	const { userId } = session.meta
	return record.meta.ownerId === userId && (!prev || prev.meta.ownerId === userId)
		? null
		: 'not your shape'
})

const pageId = PageRecordType.createId('page')
const mine = createShapeId('mine')
const theirs = createShapeId('theirs')

function frame(id: TLShapeId, ownerId: string): TLRecord {
	return schema.types.shape.create({
		id,
		type: 'frame',
		parentId: pageId,
		index: (id === mine ? 'a1' : 'a2') as IndexKey,
		meta: { ownerId },
		props: { w: 100, h: 100, name: '', color: 'black' },
	}) as TLRecord
}

const disposables: Array<() => void> = []
afterEach(() => {
	for (const dispose of disposables.splice(0)) dispose()
})

/** Wires the rule the way `useSync` does: into the sync client and onto the store's props. */
function setup(
	opts: {
		serverMeta?: Meta
		clientMeta?: Meta
		canChangeRecord?: TLEditorOptions['canChangeRecord']
	} = {}
) {
	const serverMeta = opts.serverMeta ?? { userId: 'A', role: 'student' }
	const clientMeta = opts.clientMeta ?? serverMeta
	const server = new TestServer<TLRecord>(
		schema,
		{
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
			documents: [
				PageRecordType.create({ id: pageId, name: 'Page', index: 'a1' as IndexKey }),
				frame(mine, 'A'),
				frame(theirs, 'B'),
			].map((state) => ({ state, lastChangedClock: 0 })),
		},
		{ authorize: rule }
	)

	const listeners = new Set<(refusal: TLRefusal) => void>()
	const emit = (refusal: TLRefusal) => listeners.forEach((listener) => listener(refusal))
	const access = atom<TLSessionAccess>('access', { document: 'write', objects: 'write' })
	const refusedByServer: TLSyncRefusal[] = []

	const store = createTLStore({
		schema,
		collaboration: {
			status: null,
			refusals: {
				subscribe: (listener) => (listeners.add(listener), () => void listeners.delete(listener)),
			},
			authorize: {
				rule,
				getSession: () => ({ sessionId: '', meta: clientMeta, access: access.get() }),
			},
		},
	})
	const pair = new TestSocketPair<TLRecord>('a', server)
	pair.connect = () => server.connect(pair, { meta: serverMeta })
	const client = new TLSyncClient<TLRecord>({
		store,
		socket: pair.clientSocket,
		presence: computed('presence', () => null),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error('onSyncError: ' + reason)
		},
		onAfterConnect: (_, details) => access.set(details.access),
		onPushRefused: (refusal) => {
			refusedByServer.push(refusal)
			emit({ ...refusal, source: 'server' })
		},
		authorize: {
			rule,
			meta: clientMeta,
			onRefusedLocally: (refusal) => emit({ ...refusal, source: 'local' }),
		},
	})
	disposables.push(() => client.close())
	pair.connect()

	function settle() {
		for (let i = 0; i < 1000; i++) {
			server.flushDebouncingMessages()
			if (!pair.getNeedsFlushing()) return
			pair.flushClientSentEvents()
			pair.flushServerSentEvents()
		}
		throw new Error('did not settle')
	}
	settle()

	const editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		initialState: 'select',
		store,
		getContainer: () => document.createElement('div'),
		canChangeRecord: opts.canChangeRecord,
	})
	disposables.push(() => editor.dispose())
	const refused: TLRefusal[] = []
	editor.on('refused', (refusal) => refused.push(refusal))
	settle()

	const onServer = (id: string) =>
		server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state as
			| TLFrameShape
			| undefined

	return { editor, store, settle, refused, refusedByServer, onServer }
}

const xOf = (editor: Editor, id: TLShapeId) => editor.getShape(id)!.x

describe('one write rule for the room, the sync client and the editor', () => {
	it('the editor does not start a change the room would refuse', () => {
		const { editor, settle, refused, refusedByServer, onServer } = setup()
		const their = editor.getShape(theirs)!

		expect(editor.canChangeRecord({ type: 'update', prev: their, next: { ...their, x: 50 } })).toBe(
			false
		)
		editor.updateShapes([{ id: theirs, type: 'frame', x: 50 }])
		editor.deleteShapes([theirs])
		editor.createShapes([{ type: 'frame', meta: { ownerId: 'B' } }])
		editor.updateShapes([{ id: mine, type: 'frame', x: 50 }])
		settle()

		expect(xOf(editor, theirs)).toBe(0)
		expect(editor.getCurrentPageShapeIds().size).toBe(2)
		expect(xOf(editor, mine)).toBe(50)
		expect(onServer(mine)?.x).toBe(50)
		// nothing was refused, because nothing refusable was ever written
		expect(refused).toEqual([])
		expect(refusedByServer).toEqual([])
	})

	it('the sync client holds back a write that skips the editor', () => {
		const { editor, store, settle, refused, refusedByServer, onServer } = setup()

		store.put([{ ...(store.get(theirs) as TLFrameShape), x: 50 }])
		settle()

		expect(xOf(editor, theirs)).toBe(0)
		expect(onServer(theirs)?.x).toBe(0)
		expect(refused).toEqual([{ reason: 'not your shape', ids: [theirs], source: 'local' }])
		expect(refusedByServer).toEqual([])
	})

	// the gate's undo squashes to a no-op update in the editor's pending history entry
	it.fails('a local refusal leaves no undo step behind', () => {
		const { editor, store, settle } = setup()

		store.put([{ ...(store.get(theirs) as TLFrameShape), x: 50 }])
		settle()

		expect(editor.getCanUndo()).toBe(false)
	})

	it('the room still decides when the client is wrong about its session', () => {
		const { editor, settle, refused, onServer } = setup({
			serverMeta: { userId: 'A', role: 'student' },
			clientMeta: { userId: 'A', role: 'teacher' },
		})

		editor.updateShapes([{ id: theirs, type: 'frame', x: 50 }])
		expect(xOf(editor, theirs)).toBe(50)
		settle()

		expect(xOf(editor, theirs)).toBe(0)
		expect(onServer(theirs)?.x).toBe(0)
		expect(refused).toMatchObject([{ reason: 'not your shape', ids: [theirs], source: 'server' }])
		expect(editor.getCanUndo()).toBe(false)
	})

	it('an explicit canChangeRecord stacks on top of the rule', () => {
		const { editor, settle, refused } = setup({
			canChangeRecord: (change) => change.type !== 'delete',
		})

		editor.deleteShapes([mine])
		editor.updateShapes([{ id: mine, type: 'frame', x: 50 }])
		editor.updateShapes([{ id: theirs, type: 'frame', x: 50 }])
		settle()

		expect(xOf(editor, mine)).toBe(50)
		expect(xOf(editor, theirs)).toBe(0)
		expect(refused).toEqual([])
	})
})
