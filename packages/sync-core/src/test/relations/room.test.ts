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
	it('get a remove for every record they may not read now', async () => {
		const room = new TLSocketRoom<TLRecord, void>({
			schema,
			initialSnapshot: DEFAULT_INITIAL_SNAPSHOT,
			access: createRelationRoomAccess(defaultRelationSchema),
		})
		const s1 = socket()
		room.handleSocketConnect({ sessionId: 'ann', socket: s1, access: viewer })
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

		const s2 = socket()
		room.handleSocketResume({ sessionId: 'ann', socket: s2, snapshot })
		const sent = s2.send.mock.calls.map(([m]) => JSON.parse(m))
		const removed = sent
			.flatMap((m) => (m.type === 'data' ? m.data : [m]))
			.filter((m) => m.type === 'patch')
			.flatMap((m) => Object.keys(m.diff))
		expect(removed).toContain(secret)
		expect(removed).not.toContain('page:page')
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
