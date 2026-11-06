import {
	PageRecordType,
	TLRecord,
	createRelation,
	createTLSchema,
	relationSchemaRecords,
} from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_INITIAL_SNAPSHOT } from '../../lib/InMemorySyncStorage'
import { getTlsyncProtocolVersion } from '../../lib/protocol'
import { defaultRelationSchema } from '../../lib/relations/defaultSchema'
import { TLRelationContext } from '../../lib/relations/evaluate'
import { createRelationRoomAccess } from '../../lib/relations/roomAccess'
import { TLSocketRoom } from '../../lib/TLSocketRoom'

const schema = createTLSchema({ records: relationSchemaRecords })

function socket() {
	return {
		send: vi.fn(),
		close: vi.fn(),
		readyState: 1,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}
}

const viewer: TLRelationContext = {
	actor: 'user:ann',
	subjects: ['user:ann'],
	root: 'file:f',
	rootRelations: ['read', 'viewer'],
}

describe('resumed sessions', () => {
	it('reconnect, so a grant that changed while the room slept applies', async () => {
		const room = new TLSocketRoom<TLRecord, void>({
			schema,
			initialSnapshot: DEFAULT_INITIAL_SNAPSHOT,
			access: createRelationRoomAccess(defaultRelationSchema),
		})
		const connect = (s: ReturnType<typeof socket>) => {
			room.handleSocketConnect({ sessionId: 'ann', socket: s, access: viewer })
			room.handleSocketMessage(
				'ann',
				JSON.stringify({
					type: 'connect',
					connectRequestId: 'c',
					lastServerClock: 0,
					protocolVersion: getTlsyncProtocolVersion(),
					schema: schema.serialize(),
				})
			)
		}
		connect(socket())
		const snapshot = room.getSessionSnapshot('ann')!
		expect(snapshot.access).toEqual(viewer)

		// while Ann's socket sleeps, a page she could read is restricted
		const secret = PageRecordType.createId('secret')
		const restriction = createRelation(secret, 'restricted', '*') as unknown as TLRecord
		room.storage.transaction((txn) => {
			txn.set(secret, PageRecordType.create({ id: secret, name: 'Secret', index: 'a2' as any }))
			txn.set(restriction.id, restriction)
		})
		await Promise.resolve()

		// the room does not know what her client holds: it closes the socket without a fatal reason
		const resumed = socket()
		room.handleSocketResume({ sessionId: 'ann', socket: resumed, snapshot })
		expect(resumed.close).toHaveBeenCalledWith(undefined, undefined)
		expect(resumed.send).not.toHaveBeenCalled()

		// the client reconnects and gets a full snapshot of what it may read now
		const fresh = socket()
		connect(fresh)
		const hello = fresh.send.mock.calls
			.map(([m]) => JSON.parse(m))
			.find((m) => m.type === 'connect')
		expect(hello.hydrationType).toBe('wipe_all')
		expect(Object.keys(hello.diff)).toContain('page:page')
		expect(Object.keys(hello.diff)).not.toContain(secret)
	})

	it('are closed when the snapshot has no access context', () => {
		const room = new TLSocketRoom<TLRecord, void>({
			schema,
			initialSnapshot: DEFAULT_INITIAL_SNAPSHOT,
			access: createRelationRoomAccess(defaultRelationSchema),
		})
		const s = socket()
		room.handleSocketResume({
			sessionId: 'mallory',
			socket: s,
			snapshot: {
				serializedSchema: schema.serialize(),
				isReadonly: false,
				requiresLegacyRejection: false,
				supportsStringAppend: true,
				presenceId: null,
				presenceRecord: null,
			} as any,
		})
		expect(s.close).toHaveBeenCalled()
	})
})

describe('denied pushes', () => {
	it('close a session that keeps sending them', () => {
		const room = new TLSocketRoom<TLRecord, void>({
			schema,
			initialSnapshot: DEFAULT_INITIAL_SNAPSHOT,
			access: createRelationRoomAccess(defaultRelationSchema),
		})
		const s = socket()
		room.handleSocketConnect({ sessionId: 'ann', socket: s, access: viewer })
		room.handleSocketMessage(
			'ann',
			JSON.stringify({
				type: 'connect',
				connectRequestId: 'c',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: schema.serialize(),
			})
		)
		// a viewer may not create pages; a client without the guard sends the write again and again
		const push = (i: number) => {
			const page = PageRecordType.create({ name: 'Mine', index: 'a3' as any })
			room.handleSocketMessage(
				'ann',
				JSON.stringify({ type: 'push', clientClock: i, diff: { [page.id]: ['put', page] } })
			)
		}
		for (let i = 0; i < 20; i++) push(i)
		expect(s.close).not.toHaveBeenCalled()
		push(20)
		expect(s.close).toHaveBeenCalledWith(expect.any(Number), 'RATE_LIMITED')
	})
})
